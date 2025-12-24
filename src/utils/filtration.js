/**
 * Return per-request list of available BLOCK IDs sorted by total availability (desc).
 * quantity = minimal tickets required per block
 */
function getAvailableBlockIds(eventData, requests, opts = {}) {
  const { considerResale = false } = opts;

  if (!eventData || !Array.isArray(eventData.priceRangeCategories)) return [];

  return requests
    .map(req => {
      const cat = eventData.priceRangeCategories.find(
        c => c?.name?.de === req.category
      );
      if (!cat) return null;

      const ab = cat.areaBlocksAvailability || {};

      const blocks = (cat.blocks || []).map(block => {
        const key = String(block.id);
        const avail = ab[key] || ab[block.id] || {};
        const total =
          (avail.availability || 0) +
          (considerResale ? (avail.availabilityResale || 0) : 0);

        return {
          blockId: block.id,
          total
        };
      });

      const filteredSorted = blocks
        // quantity = minimal availability per block
        .filter(b => b.total >= req.quantity)
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return a.blockId - b.blockId; // stable tie-breaker
        });

      if (filteredSorted.length === 0) return null;

      return {
        category: req.category,
        name: req.name,
        quantity: req.quantity,
        tribune: req.tribune || "",
        blockIds: filteredSorted.map(b => b.blockId)
      };
    })
    .filter(Boolean);
}

/**
 * Finds all seat chains with strict row + adjacency rules.
 *
 * @param {Array} features - array of seat features
 * @param {number} minLen - minimal chain length
 * @param {string} category - seat category name
 * @param {Array} blacklist - seat IDs to exclude
 *
 * @returns {Array} - array of chains (arrays of seat features)
 */
function findNearbyChains(features, minLen, category, blacklist = []) {
  // Filter by category & blacklist
  const validSeats = features.filter(f => {
    const p = f.properties;
    return (
      !blacklist.includes(f.id) &&
      p.seatCategory.toLowerCase() === category.toLowerCase()
    );
  });

  // Group seats by area
  const areaMap = new Map();
  validSeats.forEach(f => {
    const areaKey = f.properties.area.name.de;
    if (!areaMap.has(areaKey)) areaMap.set(areaKey, []);
    areaMap.get(areaKey).push(f);
  });

  const chains = [];

  areaMap.forEach(seats => {
    // Sort by row DESC, number ASC
    seats.sort((a, b) => {
      const rowDiff = Number(b.properties.row) - Number(a.properties.row);
      return rowDiff !== 0 ? rowDiff : Number(a.properties.number) - Number(b.properties.number);
    });

    const used = new Set();

    for (let i = 0; i < seats.length; i++) {
      if (used.has(seats[i].id)) continue;

      let chain = [seats[i]];
      used.add(seats[i].id);

      for (let j = i + 1; j < seats.length; j++) {
        if (used.has(seats[j].id)) continue;

        const last = chain[chain.length - 1];
        const r1 = Number(last.properties.row);
        const r2 = Number(seats[j].properties.row);
        const n1 = Number(last.properties.number);
        const n2 = Number(seats[j].properties.number);

        const rowDiff = r1 - r2;
        const numDiff = Math.abs(n1 - n2);

        const canChain =
          (r1 === r2 && numDiff <= 2) || 
          (Math.abs(rowDiff) === 1 && numDiff === 1); 

        if (canChain) {
          chain.push(seats[j]);
          used.add(seats[j].id);
        }
      }

      if (chain.length >= minLen) chains.push(chain);
    }
  });

  return chains;
}


function getRandomChainSlice(chains, qty) {
  if (!chains.length) return [];
  const chain = chains[Math.floor(Math.random() * chains.length)];
  if (chain.length <= qty) return chain;
  const start = Math.floor(Math.random() * (chain.length - qty + 1));
  return chain.slice(start, start + qty);
}


function getBiggestChainSlice(chains, qty, maxSize = 6) {
  if (!Array.isArray(chains) || chains.length === 0) return [];

  let biggestChain = [];

  for (const chain of chains) {
    if (!Array.isArray(chain)) continue;

    if (chain.length >= qty && chain.length > biggestChain.length) {
      biggestChain = chain;
    }
  }

  // cap result to maxSize
  return biggestChain.slice(0, maxSize);
}




export { findNearbyChains, getAvailableBlockIds, getRandomChainSlice, getBiggestChainSlice };