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
      let blacklistIds = blacklist.map((entry) => entry.id);

      let randomCategory =
        availableBlockIds[Math.floor(Math.random() * availableBlockIds.length)];

      if (randomCategory.type === 'areas') {
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
        console.log('Fetching seat from:', seatEndpoint);

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
          return;
        }

        console.log('seatResponse:', seatResponse);

        const data = seatResponse.data;

        const grouptedItems = new Map();

        // Тариф Adult (Vollzahler)
        const adultPrice = data.prices.find(
          (p) => p.audienceSubCategory.code === 'TPUBVZ'
        );

        const groupKey = [
          productId,
          performanceId,
          data.seatCategory.id,
          adultPrice.audienceSubCategory.id,
          data.area.id,
        ].join('_');

        if (!grouptedItems.has(groupKey)) {
          grouptedItems.set(groupKey, {
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
          });
        }
        // Send cart addition request
        const items = Array.from(grouptedItems.values()).map((item) => ({
          ...item,
          quantity: randomCategory.quantity,
        }));

        const cartEndpoint = `${domain}/tnwr/v1/cart`;
        console.log('Adding seats to cart via:', cartEndpoint);
        const {
          status: cartStatus,
          text: cartText,
          json: cartResponse,
          error: cartError,
        } = await sendData(
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

        if (cartStatus !== 200 || !cartResponse || cartError) {
          console.error('Add to cart request error:', cartError, cartText);
          _countAndRun();
          return;
        }

        if (
          cartResponse?.errors?.some(
            (err) => err?.errorCode === 'TOO_MANY_TICKETS'
          )
        ) {
          console.error('Cart already has tickets, cannot add more.');
          window.location.href = `${domain}/cart/reservation/0`;
          return;
        }

        if (cartResponse?.errors?.length > 0) {
          console.error('Add to cart response errors:', cartResponse.errors);
          _countAndRun();
          return;
        }

        localStorage.setItem('blacklist', JSON.stringify(blacklist));
        console.log('Seats successfully added to cart!');

        window.location.href = `${domain}/cart/reservation/0`;
        return;
        // PICK RANDOM BLOCK ID
      } else if (randomCategory.type === 'blocks') {
        let randomBlockId =
          randomCategory.blockIds[
            Math.floor(Math.random() * randomCategory.blockIds.length)
          ];

        // Fetch seat data
        const seatsEndpoint =
          `${domain}/tnwr/v1/seatmap/seats/free/3ddvBlock` +
          `?performanceId=${performanceId}` +
          `&productId=${productId}` +
          `&blockId=${randomBlockId}` +
          `&isSeasonTicketMode=false&isExclusive=false`;

        console.log('Fetching seats from:', seatsEndpoint);

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
          return;
        }

        console.log('seatsResponse:', seatsResponse);
        let nearbyChains = findNearbyChains(
          seatsResponse.features,
          randomCategory.quantity,
          randomCategory.category,
          blacklistIds
        );

        if (nearbyChains.length === 0) {
          console.log('No nearby chains found');
          _countAndRun();
          return;
        }
        console.log('nearbyChains:', nearbyChains);

        let randomChainSlice = getBiggestChainSlice(
          nearbyChains,
          randomCategory.quantity
        );
        console.log('randomChainSlice:', randomChainSlice);

        let valid = true;
        const grouptedItems = new Map();

        for (let seatFeature of randomChainSlice) {
          const seatId = seatFeature.id;
          blacklist.push({ id: seatId, timestamp: Date.now() });

          const seatEndpoint =
            `${domain}/tnwr/v1/seatmap/seats/detail?` +
            `productId=${productId}` +
            `&perfId=${performanceId}` +
            `&seatId=${seatId}` +
            `&isChangeSeat=false&isExclusive=false&advantageId=`;
          console.log('Fetching seat from:', seatEndpoint);

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
            valid = false;
            break;
          }

          console.log('seatResponse:', seatResponse);

          const data = seatResponse.data;

          // Тариф Adult (Vollzahler)
          const adultPrice = data.prices.find(
            (p) => p.audienceSubCategory.code === 'TPUBVZ'
          );

          const groupKey = [
            productId,
            performanceId,
            data.seatCategory.id,
            adultPrice.audienceSubCategory.id,
            data.block.id,
          ].join('_');

          if (!grouptedItems.has(groupKey)) {
            grouptedItems.set(groupKey, {
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

          grouptedItems.get(groupKey).physicalSeatIds.push(seatId);
        }
        if (!valid) {
          _countAndRun();
          return;
        }

        // Send cart addition request
        const items = Array.from(grouptedItems.values()).map((item) => ({
          ...item,
          quantity: randomChainSlice.length,
        }));

        const cartEndpoint = `${domain}/tnwr/v1/cart`;
        console.log('Adding seats to cart via:', cartEndpoint);
        const {
          status: cartStatus,
          text: cartText,
          json: cartResponse,
          error: cartError,
        } = await sendData(
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

        if (cartStatus !== 200 || !cartResponse || cartError) {
          console.error('Add to cart request error:', cartError, cartText);
          _countAndRun();
          return;
        }

        if (
          cartResponse?.errors?.some(
            (err) => err?.errorCode === 'TOO_MANY_TICKETS'
          )
        ) {
          console.error('Cart already has tickets, cannot add more.');
          window.location.href = `${domain}/cart/reservation/0`;
          return;
        }

        if (cartResponse?.errors?.length > 0) {
          console.error('Add to cart response errors:', cartResponse.errors);
          _countAndRun();
          return;
        }

        localStorage.setItem('blacklist', JSON.stringify(blacklist));
        console.log('Seats successfully added to cart!');

        window.location.href = `${domain}/cart/reservation/0`;
        return;
      }
    }
  } catch (err) {
    console.error('Resale flow error:', err);
  }
  return false;
}

(async function init() {
  await waitForSheetData();
  await main();
})();

setInterval(() => {
  requestSheetData();
}, 60_000);
