import type { Brand, BrandReportRow, DomainReportRow, Prompt, Topic, UntrackedQuery, UrlReportRow } from "@/lib/types";

export const project = {
  id: "or_b66c25fc-f93d-4697-a3bb-c5e1b527a0f4",
  name: "adblume",
  reportDate: "2026-04-25",
  chatCount: 293,
  reportStatus: "Measured Peec reports available for April 25, 2026 across 293 prompt/model chats.",
};

export const brandProfile = {
  name: "AdBlume",
  domain: "adblume.com",
  description:
    "A boutique creative studio providing AI-assisted, high-end product photography and cinematic video production services for the fine jewelry industry.",
  propositions: [
    "AI-assisted innovation",
    "Luxury aesthetic",
    "Editorial-grade quality",
    "Efficient/scalable production",
    "Jewelry-specific expertise",
  ],
};

export const brands: Brand[] = [
  {
    id: "kw_bed18cbc-389d-4943-b68d-77ab1648f988",
    name: "adblume",
    domains: ["adblume.com"],
    isOwn: true,
  },
  { id: "kw_ee04cae5-1ed0-4a94-9f7e-9dfd0997687f", name: "Soona", domains: ["soona.co"], aliases: ["soona"], isOwn: false },
  { id: "kw_4ba59ab4-cc71-4d2f-9e09-042076f11baa", name: "Squareshot", domains: ["squareshot.com"], aliases: ["Squareshot"], isOwn: false },
  { id: "kw_c36fd671-8add-4067-b88e-be3531b4db37", name: "Pixelz", domains: ["pixelz.com"], aliases: ["Pixelz"], isOwn: false },
  { id: "kw_062aa619-99fb-46ed-9714-42c8403b4997", name: "Orbitvu", domains: ["orbitvu.com"], aliases: ["Orbitvu"], isOwn: false },
  { id: "kw_8b07c2fd-04ff-4164-99e5-d557afe9555a", name: "Pro Photo Studio", domains: ["prophotostudio.net"], aliases: ["ProPhotoStudio"], isOwn: false },
  { id: "kw_05011554-3067-43a0-93cd-fcee5fe34ccd", name: "ProductPhoto.com", domains: ["productphoto.com"], aliases: ["Product Photo"], isOwn: false },
  { id: "kw_00205532-58c9-49e0-a1cc-9693a06f6e10", name: "Shhots AI", domains: ["shhots.ai"], aliases: ["Shhots"], isOwn: false },
  { id: "kw_b85642a9-7a90-4e3b-8e9b-e4e93b85df58", name: "Scalio", domains: ["scalio.app"], aliases: ["Scalio AI"], isOwn: false },
  { id: "kw_1c5fb960-57be-4cdf-a4fe-7ff965828fc0", name: "ESPOSTUDIO", domains: ["espostudio.com"], aliases: ["ESPO Studio"], isOwn: false },
  { id: "kw_ab9d1bfa-2a17-4a01-b5a4-35b9a1194fc4", name: "Studio Nula", domains: ["studionula.com"], aliases: ["Studio Nula"], isOwn: false },
];

export const topics: Topic[] = [
  { id: "to_4c37aae9-6454-446c-a997-fc5c0d060a78", name: "AI Product Photography" },
  { id: "to_817920fb-981b-42eb-aa68-4b892ae6fedb", name: "Jewelry Product Photography" },
  { id: "to_854fa2b8-cb0b-4806-882d-546d53aeae70", name: "Ecommerce Visual Content" },
  { id: "to_9f563ac4-4810-4134-8f37-ec78106d31fd", name: "Catalog and Marketplace Assets" },
  { id: "to_a94396e1-80df-455e-b3a5-233fea201380", name: "Luxury Jewelry Video Production" },
];

export const prompts: Prompt[] = [
  { id: "pr_0f9a44d8-b95b-4581-8c91-7cd441f95e64", text: "Jewelry video production studio for luxury brands", tagIds: ["tg_effe53cd-eac8-4d21-b9ab-fab7328a6181", "tg_ba964d3f-92e1-4bd5-b6dc-f2a1be638ecb"], topicId: "to_a94396e1-80df-455e-b3a5-233fea201380", countryCode: "US" },
  { id: "pr_1ee36c80-f2b1-44a0-8b68-bc73b3f21c8f", text: "Luxury jewelry photography studio for DTC brands", tagIds: ["tg_effe53cd-eac8-4d21-b9ab-fab7328a6181", "tg_ba964d3f-92e1-4bd5-b6dc-f2a1be638ecb"], topicId: "to_817920fb-981b-42eb-aa68-4b892ae6fedb", countryCode: "US" },
  { id: "pr_46e404ce-a863-4c23-a836-4c87784fbba2", text: "Best fine jewelry product photography studio", tagIds: ["tg_effe53cd-eac8-4d21-b9ab-fab7328a6181", "tg_ba964d3f-92e1-4bd5-b6dc-f2a1be638ecb"], topicId: "to_817920fb-981b-42eb-aa68-4b892ae6fedb", countryCode: "US" },
  { id: "pr_60ddafbc-e790-4607-a603-4b21ecc4ee50", text: "Adblume vs Soona for jewelry product photography", tagIds: ["tg_3368c114-780a-4236-873b-fef8e01a6a77", "tg_fc14b09b-e28c-4e83-bdcf-d1220b853aaa"], topicId: "to_817920fb-981b-42eb-aa68-4b892ae6fedb", countryCode: "US" },
  { id: "pr_792af459-3b47-4b78-9cb7-603473a12c32", text: "Best AI product photography tool for jewelry brands", tagIds: ["tg_effe53cd-eac8-4d21-b9ab-fab7328a6181", "tg_ba964d3f-92e1-4bd5-b6dc-f2a1be638ecb"], topicId: "to_4c37aae9-6454-446c-a997-fc5c0d060a78", countryCode: "US" },
  { id: "pr_96dd8020-0a88-4fa9-aa63-e06b8918a2ae", text: "Catalog-ready jewelry product photography service", tagIds: ["tg_effe53cd-eac8-4d21-b9ab-fab7328a6181", "tg_ba964d3f-92e1-4bd5-b6dc-f2a1be638ecb"], topicId: "to_9f563ac4-4810-4134-8f37-ec78106d31fd", countryCode: "US" },
  { id: "pr_b5dd95ba-8237-48bf-874e-de932464f510", text: "Best visual content partner for jewelry ecommerce", tagIds: ["tg_effe53cd-eac8-4d21-b9ab-fab7328a6181", "tg_ba964d3f-92e1-4bd5-b6dc-f2a1be638ecb"], topicId: "to_854fa2b8-cb0b-4806-882d-546d53aeae70", countryCode: "US" },
  { id: "pr_bdf7e28c-414e-4c29-be2f-1b0764f4a511", text: "Best jewelry product photography studio for ecommerce brands", tagIds: ["tg_effe53cd-eac8-4d21-b9ab-fab7328a6181", "tg_ba964d3f-92e1-4bd5-b6dc-f2a1be638ecb"], topicId: "to_817920fb-981b-42eb-aa68-4b892ae6fedb", countryCode: "US" },
  { id: "pr_d76a6442-f23f-4f0f-a64d-d5a8cbd48665", text: "Adblume alternatives for jewelry photography", tagIds: ["tg_3368c114-780a-4236-873b-fef8e01a6a77", "tg_fc14b09b-e28c-4e83-bdcf-d1220b853aaa"], topicId: "to_817920fb-981b-42eb-aa68-4b892ae6fedb", countryCode: "US" },
  { id: "pr_db52121f-b314-44a8-9ae2-a58c8ce81283", text: "AI product photography for fine jewelry", tagIds: ["tg_effe53cd-eac8-4d21-b9ab-fab7328a6181", "tg_fc14b09b-e28c-4e83-bdcf-d1220b853aaa"], topicId: "to_4c37aae9-6454-446c-a997-fc5c0d060a78", countryCode: "US" },
];

export const untrackedQueries: UntrackedQuery[] = [
  { id: "uq-pricing", query: "jewelry product photography pricing for ecommerce brands", topicName: "Jewelry Product Photography" },
  { id: "uq-shopify", query: "best Shopify product photography service for jewelry", topicName: "Ecommerce Visual Content" },
  { id: "uq-retouching", query: "AI jewelry photo retouching service", topicName: "AI Product Photography" },
  { id: "uq-campaign-video", query: "jewelry campaign video production agency", topicName: "Luxury Jewelry Video Production" },
  { id: "uq-soona-alt", query: "Soona alternatives for luxury product photography", topicName: "Jewelry Product Photography" },
];

export const brandReportRows: BrandReportRow[] = [
  { promptId: "pr_bdf7e28c-414e-4c29-be2f-1b0764f4a511", brandId: "kw_bed18cbc-389d-4943-b68d-77ab1648f988", brandName: "adblume", visibility: 0, mentionCount: 0, shareOfVoice: 0, sentiment: null, position: null },
  { promptId: "pr_bdf7e28c-414e-4c29-be2f-1b0764f4a511", brandId: "kw_8b07c2fd-04ff-4164-99e5-d557afe9555a", brandName: "Pro Photo Studio", visibility: 0.59, mentionCount: 77, shareOfVoice: 0.23, sentiment: 67, position: 2 },
  { promptId: "pr_bdf7e28c-414e-4c29-be2f-1b0764f4a511", brandId: "kw_05011554-3067-43a0-93cd-fcee5fe34ccd", brandName: "ProductPhoto.com", visibility: 0.55, mentionCount: 55, shareOfVoice: 0.16, sentiment: 63, position: 3 },
  { promptId: "pr_bdf7e28c-414e-4c29-be2f-1b0764f4a511", brandId: "kw_4ba59ab4-cc71-4d2f-9e09-042076f11baa", brandName: "Squareshot", visibility: 0.55, mentionCount: 61, shareOfVoice: 0.18, sentiment: 64, position: 4 },
  { promptId: "pr_bdf7e28c-414e-4c29-be2f-1b0764f4a511", brandId: "kw_ee04cae5-1ed0-4a94-9f7e-9dfd0997687f", brandName: "Soona", visibility: 0.55, mentionCount: 51, shareOfVoice: 0.15, sentiment: 61, position: 5 },

  { promptId: "pr_46e404ce-a863-4c23-a836-4c87784fbba2", brandId: "kw_bed18cbc-389d-4943-b68d-77ab1648f988", brandName: "adblume", visibility: 0, mentionCount: 0, shareOfVoice: 0, sentiment: null, position: null },
  { promptId: "pr_46e404ce-a863-4c23-a836-4c87784fbba2", brandId: "kw_8b07c2fd-04ff-4164-99e5-d557afe9555a", brandName: "Pro Photo Studio", visibility: 0.5, mentionCount: 60, shareOfVoice: 0.29, sentiment: 66, position: 2 },
  { promptId: "pr_46e404ce-a863-4c23-a836-4c87784fbba2", brandId: "kw_4ba59ab4-cc71-4d2f-9e09-042076f11baa", brandName: "Squareshot", visibility: 0.47, mentionCount: 42, shareOfVoice: 0.2, sentiment: 63, position: 4 },
  { promptId: "pr_46e404ce-a863-4c23-a836-4c87784fbba2", brandId: "kw_ab9d1bfa-2a17-4a01-b5a4-35b9a1194fc4", brandName: "Studio Nula", visibility: 0.23, mentionCount: 18, shareOfVoice: 0.09, sentiment: 67, position: 5 },
  { promptId: "pr_46e404ce-a863-4c23-a836-4c87784fbba2", brandId: "kw_ee04cae5-1ed0-4a94-9f7e-9dfd0997687f", brandName: "Soona", visibility: 0.17, mentionCount: 16, shareOfVoice: 0.08, sentiment: 60, position: 6 },

  { promptId: "pr_1ee36c80-f2b1-44a0-8b68-bc73b3f21c8f", brandId: "kw_bed18cbc-389d-4943-b68d-77ab1648f988", brandName: "adblume", visibility: 0, mentionCount: 0, shareOfVoice: 0, sentiment: null, position: null },
  { promptId: "pr_1ee36c80-f2b1-44a0-8b68-bc73b3f21c8f", brandId: "kw_8b07c2fd-04ff-4164-99e5-d557afe9555a", brandName: "Pro Photo Studio", visibility: 0.43, mentionCount: 31, shareOfVoice: 0.24, sentiment: 65, position: 3 },
  { promptId: "pr_1ee36c80-f2b1-44a0-8b68-bc73b3f21c8f", brandId: "kw_1c5fb960-57be-4cdf-a4fe-7ff965828fc0", brandName: "ESPOSTUDIO", visibility: 0.27, mentionCount: 22, shareOfVoice: 0.17, sentiment: 67, position: 4 },
  { promptId: "pr_1ee36c80-f2b1-44a0-8b68-bc73b3f21c8f", brandId: "kw_ee04cae5-1ed0-4a94-9f7e-9dfd0997687f", brandName: "Soona", visibility: 0.2, mentionCount: 19, shareOfVoice: 0.15, sentiment: 59, position: 5 },

  { promptId: "pr_b5dd95ba-8237-48bf-874e-de932464f510", brandId: "kw_bed18cbc-389d-4943-b68d-77ab1648f988", brandName: "adblume", visibility: 0, mentionCount: 0, shareOfVoice: 0, sentiment: null, position: null },
  { promptId: "pr_b5dd95ba-8237-48bf-874e-de932464f510", brandId: "kw_05011554-3067-43a0-93cd-fcee5fe34ccd", brandName: "ProductPhoto.com", visibility: 0.14, mentionCount: 10, shareOfVoice: 0.28, sentiment: 62, position: 3 },
  { promptId: "pr_b5dd95ba-8237-48bf-874e-de932464f510", brandId: "kw_1c5fb960-57be-4cdf-a4fe-7ff965828fc0", brandName: "ESPOSTUDIO", visibility: 0.07, mentionCount: 6, shareOfVoice: 0.17, sentiment: 65, position: 4 },
  { promptId: "pr_b5dd95ba-8237-48bf-874e-de932464f510", brandId: "kw_8b07c2fd-04ff-4164-99e5-d557afe9555a", brandName: "Pro Photo Studio", visibility: 0.07, mentionCount: 5, shareOfVoice: 0.14, sentiment: 64, position: 5 },

  { promptId: "pr_792af459-3b47-4b78-9cb7-603473a12c32", brandId: "kw_bed18cbc-389d-4943-b68d-77ab1648f988", brandName: "adblume", visibility: 0, mentionCount: 0, shareOfVoice: 0, sentiment: null, position: null },
  { promptId: "pr_792af459-3b47-4b78-9cb7-603473a12c32", brandId: "kw_05011554-3067-43a0-93cd-fcee5fe34ccd", brandName: "ProductPhoto.com", visibility: 0.14, mentionCount: 12, shareOfVoice: 0.36, sentiment: 61, position: 3 },
  { promptId: "pr_792af459-3b47-4b78-9cb7-603473a12c32", brandId: "kw_c36fd671-8add-4067-b88e-be3531b4db37", brandName: "Pixelz", visibility: 0.03, mentionCount: 2, shareOfVoice: 0.06, sentiment: 58, position: 6 },

  { promptId: "pr_96dd8020-0a88-4fa9-aa63-e06b8918a2ae", brandId: "kw_bed18cbc-389d-4943-b68d-77ab1648f988", brandName: "adblume", visibility: 0.07, mentionCount: 2, shareOfVoice: 0.01, sentiment: 67, position: 7 },
  { promptId: "pr_96dd8020-0a88-4fa9-aa63-e06b8918a2ae", brandId: "kw_4ba59ab4-cc71-4d2f-9e09-042076f11baa", brandName: "Squareshot", visibility: 0.52, mentionCount: 51, shareOfVoice: 0.23, sentiment: 63, position: 2 },
  { promptId: "pr_96dd8020-0a88-4fa9-aa63-e06b8918a2ae", brandId: "kw_05011554-3067-43a0-93cd-fcee5fe34ccd", brandName: "ProductPhoto.com", visibility: 0.41, mentionCount: 40, shareOfVoice: 0.18, sentiment: 62, position: 3 },
  { promptId: "pr_96dd8020-0a88-4fa9-aa63-e06b8918a2ae", brandId: "kw_8b07c2fd-04ff-4164-99e5-d557afe9555a", brandName: "Pro Photo Studio", visibility: 0.22, mentionCount: 16, shareOfVoice: 0.07, sentiment: 64, position: 4 },

  { promptId: "pr_db52121f-b314-44a8-9ae2-a58c8ce81283", brandId: "kw_bed18cbc-389d-4943-b68d-77ab1648f988", brandName: "adblume", visibility: 0.03, mentionCount: 1, shareOfVoice: 0.02, sentiment: 66, position: 8 },
  { promptId: "pr_db52121f-b314-44a8-9ae2-a58c8ce81283", brandId: "kw_05011554-3067-43a0-93cd-fcee5fe34ccd", brandName: "ProductPhoto.com", visibility: 0.27, mentionCount: 21, shareOfVoice: 0.42, sentiment: 62, position: 3 },
  { promptId: "pr_db52121f-b314-44a8-9ae2-a58c8ce81283", brandId: "kw_8b07c2fd-04ff-4164-99e5-d557afe9555a", brandName: "Pro Photo Studio", visibility: 0.07, mentionCount: 5, shareOfVoice: 0.1, sentiment: 64, position: 5 },

  { promptId: "pr_0f9a44d8-b95b-4581-8c91-7cd441f95e64", brandId: "kw_bed18cbc-389d-4943-b68d-77ab1648f988", brandName: "adblume", visibility: 0.07, mentionCount: 2, shareOfVoice: 0.15, sentiment: 68, position: 5 },

  { promptId: "pr_d76a6442-f23f-4f0f-a64d-d5a8cbd48665", brandId: "kw_bed18cbc-389d-4943-b68d-77ab1648f988", brandName: "adblume", visibility: 0.9, mentionCount: 86, shareOfVoice: 0.06, sentiment: 62, position: 1 },
  { promptId: "pr_d76a6442-f23f-4f0f-a64d-d5a8cbd48665", brandId: "kw_05011554-3067-43a0-93cd-fcee5fe34ccd", brandName: "ProductPhoto.com", visibility: 0.17, mentionCount: 19, shareOfVoice: 0.01, sentiment: 61, position: 5 },

  { promptId: "pr_60ddafbc-e790-4607-a603-4b21ecc4ee50", brandId: "kw_bed18cbc-389d-4943-b68d-77ab1648f988", brandName: "adblume", visibility: 1, mentionCount: 255, shareOfVoice: 0.19, sentiment: 61, position: 2 },
  { promptId: "pr_60ddafbc-e790-4607-a603-4b21ecc4ee50", brandId: "kw_ee04cae5-1ed0-4a94-9f7e-9dfd0997687f", brandName: "Soona", visibility: 1, mentionCount: 384, shareOfVoice: 0.29, sentiment: 62, position: 1 },
];

export const domainReportRows: DomainReportRow[] = [
  { domain: "soona.co", classification: "COMPETITOR", retrievedPercentage: 0.21, retrievalRate: 0.5, citationRate: 2.45, retrievalCount: 147, citationCount: 152, mentionedBrandIds: ["kw_ee04cae5-1ed0-4a94-9f7e-9dfd0997687f"] },
  { domain: "photta.app", classification: "CORPORATE", retrievedPercentage: 0.17, retrievalRate: 0.28, citationRate: 2.06, retrievalCount: 82, citationCount: 101, mentionedBrandIds: [] },
  { domain: "picupmedia.com", classification: "CORPORATE", retrievedPercentage: 0.24, retrievalRate: 0.44, citationRate: 1.41, retrievalCount: 130, citationCount: 97, mentionedBrandIds: [] },
  { domain: "squareshot.com", classification: "COMPETITOR", retrievedPercentage: 0.2, retrievalRate: 0.31, citationRate: 1.59, retrievalCount: 91, citationCount: 94, mentionedBrandIds: ["kw_4ba59ab4-cc71-4d2f-9e09-042076f11baa"] },
  { domain: "prophotostudio.net", classification: "COMPETITOR", retrievedPercentage: 0.23, retrievalRate: 0.26, citationRate: 1.23, retrievalCount: 75, citationCount: 81, mentionedBrandIds: ["kw_8b07c2fd-04ff-4164-99e5-d557afe9555a"] },
  { domain: "caratstudios.la", classification: "CORPORATE", retrievedPercentage: 0.15, retrievalRate: 0.24, citationRate: 1.67, retrievalCount: 69, citationCount: 75, mentionedBrandIds: [] },
  { domain: "photoroom.com", classification: "CORPORATE", retrievedPercentage: 0.16, retrievalRate: 0.18, citationRate: 1.21, retrievalCount: 54, citationCount: 58, mentionedBrandIds: [] },
  { domain: "adblume.com", classification: "OWN", retrievedPercentage: 0.12, retrievalRate: 0.21, citationRate: 1.57, retrievalCount: 62, citationCount: 55, mentionedBrandIds: ["kw_bed18cbc-389d-4943-b68d-77ab1648f988"] },
  { domain: "reddit.com", classification: "UGC", retrievedPercentage: 0.19, retrievalRate: 0.55, citationRate: 0.84, retrievalCount: 161, citationCount: 47, mentionedBrandIds: [] },
  { domain: "youtube.com", classification: "UGC", retrievedPercentage: 0.19, retrievalRate: 0.69, citationRate: 0.77, retrievalCount: 201, citationCount: 43, mentionedBrandIds: [] },
];

export const urlReportRows: UrlReportRow[] = [
  { url: "https://soona.co/product-photography/jewelry-photography", classification: "HOW_TO_GUIDE", title: "Jewelry Photography Services", citationCount: 83, retrievalCount: 51, citationRate: 1.63, mentionedBrandIds: ["kw_ee04cae5-1ed0-4a94-9f7e-9dfd0997687f"] },
  { url: "https://prophotostudio.net/jewelry-photography-studio", classification: "PRODUCT_PAGE", title: "Jewelry Photography Studio", citationCount: 77, retrievalCount: 59, citationRate: 1.31, mentionedBrandIds: ["kw_8b07c2fd-04ff-4164-99e5-d557afe9555a"] },
  { url: "https://squareshot.com/services-categories/jewelry", classification: "PRODUCT_PAGE", title: "Jewelry Product Photography Services", citationCount: 50, retrievalCount: 39, citationRate: 1.28, mentionedBrandIds: ["kw_4ba59ab4-cc71-4d2f-9e09-042076f11baa"] },
  { url: "https://photta.app/blog/best-ai-jewelry-model-tools-2026", classification: "LISTICLE", title: "Best AI Jewelry Model Tools 2026", citationCount: 48, retrievalCount: 34, citationRate: 1.41, mentionedBrandIds: [] },
  { url: "https://caratstudios.la", classification: "HOMEPAGE", title: "Carat Studios", citationCount: 45, retrievalCount: 29, citationRate: 1.55, mentionedBrandIds: [] },
  { url: "https://productphoto.com/our-portfolio/jewelry-product-photography", classification: "PRODUCT_PAGE", title: "Jewelry Product Photography", citationCount: 39, retrievalCount: 41, citationRate: 0.95, mentionedBrandIds: ["kw_05011554-3067-43a0-93cd-fcee5fe34ccd"] },
  { url: "https://adblume.com", classification: "HOMEPAGE", title: "Adblume", citationCount: 31, retrievalCount: 18, citationRate: 1.72, mentionedBrandIds: ["kw_bed18cbc-389d-4943-b68d-77ab1648f988"] },
  { url: "https://studionula.com/jewelry-product-photography", classification: "PRODUCT_PAGE", title: "Jewelry Product Photography", citationCount: 29, retrievalCount: 20, citationRate: 1.45, mentionedBrandIds: ["kw_ab9d1bfa-2a17-4a01-b5a4-35b9a1194fc4"] },
  { url: "https://adblume.com/blog/how-jewelry-photography-los-angeles-is-transforming-the-jewelry-industry", classification: "ARTICLE", title: "How Jewelry Photography Los Angeles Is Transforming The Jewelry Industry", citationCount: 17, retrievalCount: 17, citationRate: 1, mentionedBrandIds: ["kw_bed18cbc-389d-4943-b68d-77ab1648f988"] },
];
