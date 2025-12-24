README.md

# RB Leipzig Extension API

This document describes the API endpoints used by the Chrome extension script for automating ticket on the RB Leipzig platform.

## Endpoints

---

### `/tnwr/v1/seatmap/availability`

**METHOD:** GET

**Query Parameters:**

* `productId` (string)
* `perfId` (string)
* `isSeasonTicketMode` (bool)

**Request Headers**
* `X-Csrf-Token` (string) // Can be acquired from API
* `x-secutix-secretkey` (string) // Static value **DUMMY**
* `x-secutix-host` (string) // Static value **tickets.rbleipzig.com**

**Example:**

```
https://tickets.rbleipzig.com/tnwr/v1/seatmap/availability?perfId=10229270235128&isSeasonTicketMode=false&productId=10229270232694
```

**Response:**

Returns a JSON priceRangeCategories of available areas, each with `id` - area id, `name.de` - category, `areaBlocksAvailability`,  `availabilityResale`, `amount`, etc.

```json
{
    "priceRangeCategories": [
        {
            "id": 10229272920405,
            "name": {
                "de": "PK0"
            },
            "rank": 2,
            "bgColor": "FFC890",
            "textColor": "000000",
            "sameBlockRestrictionMode": "NONE",
            "minPrice": 89000,
            "maxPrice": 89000,
            "blocks": [
                {
                    "id": 10229272792353,
                    "name": {
                        "de": "18",
                        "en": "18"
                    },
                    "area": {
                        "id": 10229272713975,
                        "name": {
                            "de": "Sektor A-Unterrang",
                            "en": "Sektor A-Unterrang"
                        }
                    }
                },
                {
                    "id": 10229272792382,
                    "name": {
                        "de": "2",
                        "en": "2"
                    },
                    "area": {
                        "id": 10229272713976,
                        "name": {
                            "de": "Sektor C-Unterrang",
                            "en": "Sektor C-Unterrang"
                        }
                    }
                },
                {
                    "id": 10229272792350,
                    "name": {
                        "de": "35",
                        "en": "35"
                    },
                    "area": {
                        "id": 10229272713976,
                        "name": {
                            "de": "Sektor C-Unterrang",
                            "en": "Sektor C-Unterrang"
                        }
                    }
                }
            ],
            "areas": [],
            "areaBlocksAvailability": {
                "10229272792353": {
                    "availability": 0,
                    "availabilityResale": 1
                },
                "10229272792382": {
                    "availability": 0,
                    "availabilityResale": 0
                },
                "10229272792350": {
                    "availability": 0,
                    "availabilityResale": 0
                }
            }
        },
  ...
```

---

### `/tnwr/v1/seatmap/seats/free/3ddvBlock`

**METHOD:** GET

**Query Parameters:**

* `productId` (string)
* `perfId` (string)
* `isSeasonTicketMode` (bool)

**Request Headers**
* `X-Csrf-Token` (string) // Can be acquired from API
* `x-secutix-secretkey` (string) // Static value **DUMMY**
* `x-secutix-host` (string) // Static value **tickets.rbleipzig.com**

**Example:**

```
https://tickets.rbleipzig.com/tnwr/v1/seatmap/seats/free/3ddvBlock?performanceId=10229270235125&productId=10229270232694&blockId=10229272792367&isSeasonTicketMode=false&isExclusive=false
```

**Response (success):**

Returns seat geometry coordinates, categories and position in a row that is used to identify nearby tickets and create a chains

```json
{
    "features": [
        {
            "id": 10229272803684,
            "geometry": {
                "coordinates": [
                    19662,
                    3138
                ],
                "rotation": 199,
                "type": "Point"
            },
            "properties": {
                "id": 10229272803684,
                "block": {
                    "id": 10229272792358,
                    "name": {
                        "de": "12 Heim-Fanbereich",
                        "en": "12 Home-Area"
                    }
                },
                "area": {
                    "id": 10229272713972,
                    "name": {
                        "de": "Sektor D",
                        "en": "Sektor D"
                    }
                },
                "color": "#187c71",
                "row": "14",
                "number": "16",
                "seatCategoryId": 10229272920414,
                "seatCategory": "PK6 Heim-Fanbereich",
                "scenePanoLink": "tk3d://https://tk3d.tk3dapi.com/ticketing3d/TICKETING3D.js?venue_id=eu-de-00020-leipzig&view_id=S_12-14-16",
                "audienceSubCategoryId": 0
            }
        },
        {
            "id": 10229272803685,
            "geometry": {
                "coordinates": [
                    19705,
                    2757
                ],
                "rotation": 198,
                "type": "Point"
            },
            "properties": {
                "id": 10229272803685,
                "block": {
                    "id": 10229272792358,
                    "name": {
                        "de": "12 Heim-Fanbereich",
                        "en": "12 Home-Area"
                    }
                },
                "area": {
                    "id": 10229272713972,
                    "name": {
                        "de": "Sektor D",
                        "en": "Sektor D"
                    }
                },
                "color": "#187c71",
                "row": "19",
                "number": "16",
                "seatCategoryId": 10229272920414,
                "seatCategory": "PK6 Heim-Fanbereich",
                "scenePanoLink": "tk3d://https://tk3d.tk3dapi.com/ticketing3d/TICKETING3D.js?venue_id=eu-de-00020-leipzig&view_id=S_12-19-16",
                "audienceSubCategoryId": 0
            }
        },
    ...
```

---

### `/tnwr/v1/seatmap/seats/detail`

**METHOD:** GET

**Query Parameters:**

* `productId` (string)
* `perfId` (string)
* `isSeasonTicketMode` (bool)

**Request Headers**
* `X-Csrf-Token` (string) // Can be acquired from API
* `x-secutix-secretkey` (string) // Static value **DUMMY**
* `x-secutix-host` (string) // Static value **tickets.rbleipzig.com**

**Example:**

```
https://tickets.rbleipzig.com/tnwr/v1/seatmap/seats/detail?productId=10229270232694&perfId=10229270235125&seatId=10229272821854&isChangeSeat=false&isExclusive=false&advantageId=
```

**Response (success):**

Returns seat metadata, available tariffs, `tariffId`, `areaBlockId`, `seatCategoryId`, etc. It is used to create a payload for a final request to cart.

```json
{
    "data": {
        "prices": [
            {
                "amount": 30000,
                "minQuantity": 1,
                "maxQuantity": 6,
                "priceLevelMemberCategory": false,
                "audienceSubCategory": {
                    "id": 10229269211120,
                    "code": "TPUBVZ",
                    "rank": 1,
                    "name": {
                        "de": "Vollzahler",
                        "en": "Adult"
                    },
                    "audienceCategoryKind": "FULL",
                    "mainAudienceCategoryName": "OCCASIONAL",
                    "requiredAudienceSubCategoryIds": [],
                    "memberCategory": false,
                    "requireAttachment": false,
                    "insideSeasonTicketCategory": false,
                    "excludeTariffFromLimits": false
                },
                "externalVerification": {},
                "degressivePrices": [],
                "amountWithoutAdvantage": 30000
            },
            {
                "amount": 27000,
                "minQuantity": 1,
                "maxQuantity": 6,
                "priceLevelMemberCategory": false,
                "audienceSubCategory": {
                    "id": 10229269212209,
                    "code": "TPUBER",
                    "rank": 2,
                    "name": {
                        "de": "Ermäßigt",
                        "en": "Reduced"
                    },
                    "description": "<p>Erm&auml;&szlig;igungsberechtigt gegen Vorlage eines g&uuml;ltigen Nachweises: Kinder und Jugendliche von 15&ndash;18 Jahren, Auszubildende, Rentner, Schwerbehinderte, B&uuml;rgergeld- Empf&auml;nger/Leipzig-Pass-Inhaber, OFC-Mitglieder, Bundesfreiwilligendienstleistende</p>",
                    "audienceCategoryKind": "REDUCED",
                    "mainAudienceCategoryName": "OCCASIONAL",
                    "requiredAudienceSubCategoryIds": [],
                    "memberCategory": false,
                    "requireAttachment": false,
                    "insideSeasonTicketCategory": false,
                    "excludeTariffFromLimits": false
                },
                "externalVerification": {},
                "degressivePrices": [],
                "amountWithoutAdvantage": 27000
            },
            {
                "amount": 15000,
                "minQuantity": 1,
                "maxQuantity": 6,
                "priceLevelMemberCategory": false,
                "audienceSubCategory": {
                    "id": 10229269212027,
                    "code": "TPUBST",
                    "rank": 4,
                    "name": {
                        "de": "Schüler/Student",
                        "en": "Pupil/Student"
                    },
                    "description": "<p>Erm&auml;&szlig;igungsberechtigt gegen Vorlage eines g&uuml;ltigen Nachweises: Sch&uuml;ler/Student</p>",
                    "audienceCategoryKind": "REDUCED",
                    "mainAudienceCategoryName": "OCCASIONAL",
                    "requiredAudienceSubCategoryIds": [],
                    "memberCategory": false,
                    "requireAttachment": false,
                    "insideSeasonTicketCategory": false,
                    "excludeTariffFromLimits": false
                },
                "externalVerification": {},
                "degressivePrices": [],
                "amountWithoutAdvantage": 15000
            },
            {
                "amount": 12000,
                "minQuantity": 1,
                "maxQuantity": 3,
                "priceLevelMemberCategory": false,
                "audienceSubCategory": {
                    "id": 10229269212232,
                    "code": "TPUBKI",
                    "rank": 5,
                    "name": {
                        "de": "Kind (0-14)",
                        "en": "Child (0-14)"
                    },
                    "description": "<p>Erm&auml;&szlig;igungsberechtigt gegen Vorlage eines g&uuml;ltigen Nachweises: Kinder von 0&ndash;14 Jahren</p>",
                    "audienceCategoryKind": "REDUCED",
                    "mainAudienceCategoryName": "OCCASIONAL",
                    "requiredAudienceSubCategoryIds": [
                        10229269211121,
                        10229269211124,
                        10229269211503,
                        10229269212008,
                        10229269212027,
                        10229405418375,
                        10229269212190,
                        10229269212209,
                        10229269212223,
                        10229269211120
                    ],
                    "memberCategory": false,
                    "requireAttachment": false,
                    "insideSeasonTicketCategory": false,
                    "excludeTariffFromLimits": false
                },
                "conditionalRate": {
                    "rateInfo": "Wähle mindestens 1 Artikel zum Tarif Vollzahler oder Vollzahler oder Ermäßigt* oder Mitarbeiterkarte oder Schüler/Student oder Bullis Bande Familienspecial - Vollzahler oder DK-Inhaber oder Ermäßigt oder Gehörlos oder Vollzahler um von diesem \"Kind (0-14)\"-Tarif zu profitieren.",
                    "rateWarning": "Du musst mindestens 1 Element zum Preis von Vollzahler oder Vollzahler oder Ermäßigt* oder Mitarbeiterkarte oder Schüler/Student oder Bullis Bande Familienspecial - Vollzahler oder DK-Inhaber oder Ermäßigt oder Gehörlos oder Vollzahler, PK6 Heim-Fanbereich auswählen, um vom \"Kind (0-14)\" Preis profitieren zu können.",
                    "triggerQuantity": 1,
                    "parentThreshold": 1,
                    "childRatio": 1,
                    "requiredAudienceSubCatIds": [
                        10229269211121,
                        10229269211124,
                        10229269211503,
                        10229269212008,
                        10229269212027,
                        10229405418375,
                        10229269212190,
                        10229269212209,
                        10229269212223,
                        10229269211120
                    ],
                    "crossSeatCategory": false,
                    "preselectMaxQuantity": false
                },
                "externalVerification": {},
                "degressivePrices": [],
                "amountWithoutAdvantage": 12000
            }
        ],
        "seatCategory": {
            "id": 10229272920414,
            "name": {
                "de": "PK6 Heim-Fanbereich"
            },
            "rank": 20,
            "bgColor": "187c71",
            "textColor": "FFFFFF",
            "sameBlockRestrictionMode": "NONE"
        },
        "block": {
            "id": 10229272792358,
            "name": {
                "de": "12 Heim-Fanbereich",
                "en": "12 Home-Area"
            }
        },
        "area": {
            "id": 10229272713972,
            "name": {
                "de": "Sektor D",
                "en": "Sektor D"
            }
        },
        "contingentId": 0,
        "scenePanoLink": "tk3d://https://tk3d.tk3dapi.com/ticketing3d/TICKETING3D.js?venue_id=eu-de-00020-leipzig&view_id=S_12-14-15",
        "seatQuality": "Klappsitz",
        "stageVisibility": "Sichtbar",
        "stageVisibilityType": "VISIBLE"
    }
}
```

---

### `/tnwr/v1/cart`

**METHOD:** GET

**Query Parameters:**

* `productId` (string)
* `perfId` (string)
* `isSeasonTicketMode` (bool)

**Request Headers**
* `X-Csrf-Token` (string) // Can be acquired from API
* `x-secutix-secretkey` (string) // Static value **DUMMY**
* `x-secutix-host` (string) // Static value **tickets.rbleipzig.com**

**Payload Example**
```json
{
    "seasonTicketMode": false,
    "items": [{
        "productId": 10229270232694,
        "quantity": 2, // An amount of tickets of the same category
        "seatCategoryId": 10229272920414,
        "tariffId": 10229269211120,
        "performanceId": 10229270235125,
        "physicalSeatIds": [10229272812029, 10229272794640],
        "areaBlockId": [10229272792365],
        "movementIds": [],
        "amount": 30000
    }, {
        "productId": 10229270232694,
        "quantity": 1,
        "seatCategoryId": 10229272920414,
        "tariffId": 10229269211120,
        "performanceId": 10229270235125,
        "physicalSeatIds": [10229272798028],
        "areaBlockId": [10229272792356],
        "movementIds": [],
        "amount": 30000
    }],
    ... // If you've purchased tickets of another category, then there should be a similiar object with corresponding data
    "partnerAdvantageId": "",
    "crossSell": {
        "ppid": "",
        "reservationIdx": "",
        "crossSellId": "",
        "baseOperationIdsString": ""
    }
}
```

**Example:**

```
https://tickets.rbleipzig.com/tnwr/v1/cart
```

**Response (success):**

Returns total items bought, cartId and expirationDate. Could be useful for future notification handler like Slack or Telegram bot.

```json
{
    "cart": {
        "cartId": 8754004,
        "totalItems": 3,
        "totalAmount": 90,
        "productsTotal": 90000,
        "cartToken": "8ca691d3-d7ff-4995-8f89-83c788445802_8754004",
        "expirationDate": "2025-12-24T12:02:11.729Z",
        "orderType": "SALE",
        "numCartItemsByProductType": {
            "SPORTING_EVENT": 3
        },
        "exchange": false
    },
    "reservationIndex": 0,
    "selectedSeatsNotAttributed": false
}
```

---

### `/ajax/selection/csrf/acquire`

**METHOD:** GET

**Example:**

```
https://tickets.rbleipzig.com/ajax/selection/csrf/acquire
```

**Response:**

Returns a CSRF token string used to protect form submissions.

---
