import { delay, filterMatchingKeys } from '../utils/helpers.js';
import { _countAndRun } from '../utils/scheduler.js';
import {
  requestSheetData,
  waitForSheetData,
} from '../services/chrome_extension_api.js';
import {
  getAvailableBlockIds,
  findNearbyChains,
  getBiggestChainSlice,
} from '../utils/filtration.js';
import config from '../../config.json';
import { getData, sendData } from '../utils/fetchUtil.js';

export let settings = {
  reloadTime: config.attempt_retry_seconds,
  matchesData: [],
  blacklist: [],
};

export async function main() {
  try {
    while (true) {
      console.log('in main', settings.matchesData);
      // If captcha dialog present, bail
      if (
        document.querySelector('#captcha_dialog') ||
        document.querySelector('iframe[title="DataDome CAPTCHA"]')
      ) {
        console.log('CAPTCHA');
        return false;
      }
      if (window.location.href.includes('noAvailability')) {
        console.log('no availability');
        history.go(-1);
        return;
      }
      if (window.location.href.includes('/cart/reservation/0')) {
        let seats = document.querySelectorAll(
          'table.widget_SPORTING_EVENT td.seat'
        );
        if (!seats) return;
        seats.forEach((seat) => {
          const innerDiv = seat.querySelector('div');

          if (!innerDiv) return;
          const txt = innerDiv.textContent.trim();
          seat.textContent = txt;
        });
        alert('Seats reserved!');
        return;
      }

      if (!settings.matchesData) {
        console.log('No matches data were found');
        _countAndRun();
        return;
      }
      const desired_match_names = settings.matchesData.map((item) => item.name);
      let team_spans = document.querySelectorAll(
        '.content_product_info > p.title span'
      );

      if (team_spans.length === 0) {
        console.log(
          'Cannot get information about current match from document selector'
        );
        _countAndRun();
        return;
      }
      const current_match_name =
        team_spans[0].textContent.trim() +
        ' vs ' +
        team_spans[2].textContent.trim();
      if (!desired_match_names.includes(current_match_name)) {
        console.log("there's no such a match in spreadsheets...");
        _countAndRun();
        return;
      }
      console.log(current_match_name, 'current match name');
      let categoriesDict = settings.matchesData.filter(
        (match) => current_match_name === match.name
      );
      // let categoriesDict = matchEntry ? matchEntry[1] : {};
      console.log('categoriesDict', categoriesDict);

      const currentUrl = window.location.href;
      if (!currentUrl.includes('perfId=')) {
        console.log('No performanceId were found...');
        _countAndRun();
        return;
      }

      // Build domain and params
      const urlObj = new URL(currentUrl);
      const domain = `${urlObj.protocol}//${urlObj.host}`;
      const performanceId = urlObj.searchParams.get('perfId');
      let productId = urlObj.searchParams.get('productId');

      if (!productId) {
        const section = document.querySelector(
          'section[data-product-type="SPORTING_EVENT"]'
        );
        productId = section && section.id.split('_')[1];
      }
      if (!productId) {
        console.log('No productId were found...');
        _countAndRun();
        return;
      }

      // Get CSRF
      const {
        status: csrfStatus,
        text: csrfText,
        json: csrfResponse,
        error: csrfError,
      } = await getData(`${domain}/ajax/selection/csrf/acquire`);

      if (csrfStatus !== 200 || csrfError) {
        console.error('Error fetching csrf token', csrfError, csrfText);
        _countAndRun();
        return;
      }
      const csrfToken = csrfText;

      // Fetch seat data
      const areasEndpoint = `${domain}/tnwr/v1/seatmap/availability?perfId=${performanceId}&productId=${productId}&isSeasonTicketMode=false`;
      console.log('Fetching seats from:', areasEndpoint);

      const {
        status: areasStatus,
        text: areasText,
        json: areasResponse,
        error: areasError,
      } = await getData(areasEndpoint, {
        headers: { 'x-csrf-token': csrfToken },
      });

      if (areasStatus !== 200 || !areasResponse || areasError) {
        console.error('Error fetching seats', areasError, areasText);
        _countAndRun();
        return;
      }
      console.log('areasResponse:', areasResponse);

      if (!areasResponse || !areasResponse?.priceRangeCategories) {
        console.log('No tickets from availableAreas request', areasResponse);
        _countAndRun();
        return;
      }

      let availableBlockIds = getAvailableBlockIds(
        areasResponse,
        categoriesDict
      );
      console.log(availableBlockIds, 'availableBlockIds');

      if (availableBlockIds.length === 0) {
        console.log('No available block IDs found');
        _countAndRun();
        return;
      }

      // filter expired blacklist
      let now = Date.now();
      let blacklist = JSON.parse(localStorage.getItem('blacklist') || '[]');
      blacklist = blacklist.filter(
        (entry) => now - entry.timestamp < config.blacklist_ttl
      );
      localStorage.setItem('blacklist', JSON.stringify(blacklist));

      let randomCategory =
        availableBlockIds[Math.floor(Math.random() * availableBlockIds.length)];

      if (randomCategory.type === 'areas') {
        await handlingStandingCategory({
          domain,
          csrfToken,
          productId,
          performanceId,
          randomCategory,
          blacklist,
        });
      } else if (randomCategory.type === 'blocks') {
        await handleBlockCategory({
          domain,
          csrfToken,
          productId,
          performanceId,
          randomCategory,
          blacklist,
        });
      }
    }
  } catch (err) {
    console.error('Resale flow error:', err);
  }
  return false;
}

async function handlingStandingCategory({
  domain,
  csrfToken,
  productId,
  performanceId,
  randomCategory,
  blacklist,
}) {
  // ADD STANDING TICKETS
  let randomAreaId =
    randomCategory.areaIds[
      Math.floor(Math.random() * randomCategory.areaIds.length)
    ];

  const seatEndpoint =
    `${domain}/tnwr/v1/seatmap/area/detail?` +
    `productId=${productId}` +
    `&perfId=${performanceId}` +
    `&areaId=${randomAreaId}` +
    `&seatCategoryId=${randomCategory.seatCategoryId}` +
    `&advantageId=&ticketFilters=BOTH`;

  console.log('[DEBUG] Fetching seat from:', seatEndpoint);

  const {
    status: seatStatus,
    text: seatText,
    json: seatResponse,
    error: seatError,
  } = await getData(seatEndpoint, {
    headers: { 'x-csrf-token': csrfToken },
  });

  if (seatStatus !== 200 || !seatResponse || seatError) {
    console.error('Error fetching seats', seatError, seatText);
    _countAndRun();
    return false;
  }

  console.log('seatResponse:', seatResponse);

  const data = seatResponse.data;
  // Тариф Adult (Vollzahler)
  const adultPrice = getAdultPrice(data);

  const items = [
    {
      productId,
      performanceId,
      seatCategoryId: data.seatCategory.id,
      tariffId: adultPrice.audienceSubCategory.id,
      areaBlockId: [data.area.id],
      physicalSeatIds: [],
      movementIds: [],
      marketType: 'BOTH',
      nonNumberSeat: true,
      amount: adultPrice.amount,
      quantity: randomCategory.quantity,
    },
  ];

  const result = await addToCart(domain, csrfToken, items);
  if (!result.ok) return false;

  localStorage.setItem('blacklist', JSON.stringify(blacklist));
  window.location.href = `${domain}/cart/reservation/0`;
  return true;
}

async function handleBlockCategory({
  domain,
  productId,
  performanceId,
  csrfToken,
  randomCategory,
  blacklist,
  blacklistIds,
}) {
  const randomBlockId =
    randomCategory.blockIds[
      Math.floor(Math.random() * randomCategory.blockIds.length)
    ];

  const seatsEndpoint =
    `${domain}/tnwr/v1/seatmap/seats/free/3ddvBlock` +
    `?performanceId=${performanceId}` +
    `&productId=${productId}` +
    `&blockId=${randomBlockId}` +
    `&isSeasonTicketMode=false&isExclusive=false`;

  const {
    status: seatsStatus,
    text: seatsText,
    json: seatsResponse,
    error: seatsError,
  } = await getData(seatsEndpoint, {
    headers: { 'x-csrf-token': csrfToken },
  });

  if (seatsStatus !== 200 || !seatsResponse || seatsError) {
    console.error('Error fetching seats', seatsError, seatsText);
    _countAndRun();
    return false;
  }

  const nearbyChains = findNearbyChains(
    seatsResponse.features,
    randomCategory.quantity,
    randomCategory.category,
    blacklistIds
  );

  if (!nearbyChains.length) return false;

  const chain = getBiggestChainSlice(nearbyChains, randomCategory.quantity);

  const grouped = new Map();

  for (const seat of chain) {
    blacklist.push({ id: seat.id, timestamp: Date.now() });

    const seatEndpoint =
      `${domain}/tnwr/v1/seatmap/seats/detail?` +
      `productId=${productId}` +
      `&perfId=${performanceId}` +
      `&seatId=${seat.id}` +
      `&isChangeSeat=false&isExclusive=false&advantageId=`;

    const {
      status: seatStatus,
      text: seatText,
      json: seatResponse,
      error: seatError,
    } = await getData(seatEndpoint, {
      headers: { 'x-csrf-token': csrfToken },
    });

    if (seatStatus !== 200 || !seatResponse || seatError) {
      console.error('Error fetching seats', seatError, seatText);
      _countAndRun();
      return false;
    }

    const data = seatResponse.data;
    const adultPrice = getAdultPrice(data);

    const key = [
      productId,
      performanceId,
      data.seatCategory.id,
      adultPrice.audienceSubCategory.id,
      data.block.id,
    ].join('_');

    if (!grouped.has(key)) {
      grouped.set(key, {
        productId,
        performanceId,
        seatCategoryId: data.seatCategory.id,
        tariffId: adultPrice.audienceSubCategory.id,
        areaBlockId: [data.block.id],
        physicalSeatIds: [],
        movementIds: [],
        amount: adultPrice.amount,
      });
    }

    grouped.get(key).physicalSeatIds.push(seat.id);
  }

  const items = [...grouped.values()].map((i) => ({
    ...i,
    quantity: chain.length,
  }));

  const result = await addToCart(domain, csrfToken, items);
  if (!result.ok) return false;

  localStorage.setItem('blacklist', JSON.stringify(blacklist));
  window.location.href = `${domain}/cart/reservation/0`;
  return true;
}

function getAdultPrice(data) {
  return data.prices.find((p) => p.audienceSubCategory.code === 'TPUBVZ');
}

async function addToCart(domain, csrfToken, items) {
  const cartEndpoint = `${domain}/tnwr/v1/cart`;
  console.log('Adding seats to cart via:', cartEndpoint);

  const { status, text, json, error } = await sendData(
    cartEndpoint,
    JSON.stringify({
      seasonTicketMode: false,
      items,
      partnerAdvantageId: '',
      crossSell: {
        ppid: '',
        reservationIdx: '',
        crossSellId: '',
        baseOperationIdsString: '',
      },
    }),
    { headers: { 'x-csrf-token': csrfToken } }
  );

  if (status !== 200 || !json || error) {
    console.error('Add to cart request error:', error, text);
    return { ok: false };
  }

  if (json?.errors?.some((e) => e?.errorCode === 'TOO_MANY_TICKETS')) {
    console.error('Cart already has tickets.');
    window.location.href = `${domain}/cart/reservation/0`;
    return { ok: false, redirect: true };
  }

  if (json?.errors?.length) {
    console.error('Add to cart response errors:', json.errors);
    return { ok: false };
  }

  return { ok: true };
}

(async function init() {
  await waitForSheetData();
  await main();
})();

setInterval(() => {
  requestSheetData();
}, 60_000);
