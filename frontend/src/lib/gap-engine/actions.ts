import type { BrandContext } from "./gaps";
import type { GapAction, QueryGap } from "./types";

const actionLabels: Record<QueryGap["recommendedAction"], string> = {
  create_service_page: "Create service page",
  create_comparison_page: "Create comparison page",
  create_alternatives_page: "Create alternatives page",
  create_listicle: "Create listicle",
  create_faq_article: "Create FAQ/article",
  source_outreach: "Source/citation outreach",
};

function pageTitle(gap: QueryGap, ctx: BrandContext) {
  if (gap.recommendedAction === "create_comparison_page") return `${gap.query}: ${ctx.brandName} comparison brief`;
  if (gap.recommendedAction === "create_alternatives_page") return `${gap.query}: premium alternatives brief`;
  if (gap.recommendedAction === "create_listicle") return `${gap.query}: buyer guide brief`;
  if (gap.recommendedAction === "create_faq_article") return `${gap.query}: education brief`;
  if (gap.recommendedAction === "source_outreach") return `${gap.query}: citation strategy brief`;
  return `${gap.query}: service page brief`;
}

function competitorSentence(gap: QueryGap) {
  const leaders = gap.winningCompetitors?.slice(0, 3);
  if (!leaders?.length) return "No competitor leader was measured for this gap yet.";
  return leaders
    .map((competitor) => `${competitor.brand} (${formatPercent(competitor.visibility)}, ${competitor.mentionCount} mentions)`)
    .join(", ");
}

function assetAngle(gap: QueryGap, ctx: BrandContext) {
  const leader = gap.winningCompetitors?.[0]?.brand;
  if (gap.query.toLowerCase().includes("tool")) {
    return `Publish a buyer guide that separates self-serve AI tools from premium AI-assisted production, then position ${ctx.brandName} as the managed option for brands that need luxury output quality.`;
  }
  if (gap.recommendedAction === "create_service_page") {
    return `Build a high-intent service page that answers the exact query, mirrors the category language Peec sees competitors winning, and makes ${ctx.brandName} the specialized alternative to ${leader ?? "larger studios"}.`;
  }
  if (gap.recommendedAction === "create_comparison_page") {
    return `Create a comparison page that concedes where ${leader ?? "the competitor"} fits, then clearly owns ${ctx.brandName}'s premium use case and AI-assisted production strengths.`;
  }
  if (gap.recommendedAction === "create_alternatives_page") {
    return `Create an alternatives page that lists the broad studios/tools already present in AI answers, then routes high-intent buyers toward ${ctx.brandName} based on fit criteria.`;
  }
  if (gap.recommendedAction === "create_listicle") {
    return "Create a listicle-style buyer guide because LLMs often cite ranked or comparative pages for best/top queries.";
  }
  if (gap.recommendedAction === "source_outreach") {
    return "Prioritize citation outreach because the owned-domain gap is weaker than the source-authority gap.";
  }
  return "Publish an educational article with direct-answer structure, FAQ schema, and internal links to the closest commercial service page.";
}

function outlineFor(gap: QueryGap, ctx: BrandContext) {
  const competitors = gap.likelyCompetitors.join(", ");
  if (gap.query.toLowerCase().includes("tool")) {
    return [
      "Open with a direct answer: software tools help with speed, but luxury jewelry brands often need managed AI-assisted production.",
      `Compare the measured alternatives: ${competitors}, broad AI tooling, and ${ctx.brandName} as a premium service workflow.`,
      "Add a decision table: self-serve tool, product photography studio, AI-assisted creative partner, and when each is appropriate.",
      "Show jewelry-specific evaluation criteria: gemstone color accuracy, metal reflections, consistent shadows, retouching control, model/context shots, and catalog readiness.",
      "Close with a low-friction conversion path: submit 3 SKUs for a visual production audit.",
    ];
  }
  if (gap.recommendedAction === "create_comparison_page") {
    return [
      "Define the buying scenario and why jewelry brands compare these options.",
      `Compare ${ctx.brandName} against ${competitors} on jewelry specialization, creative quality, workflow, and scalability.`,
      `Explain when ${ctx.brandName} is the better fit for luxury, fine jewelry, and AI-assisted production.`,
      "Add proof points: process, sample deliverables, turnaround model, and creative review path.",
      "Close with a conversion path for a sample shoot or creative audit.",
    ];
  }
  if (gap.recommendedAction === "create_alternatives_page") {
    return [
      "Frame the limitations of broad product photography services for luxury jewelry.",
      `List alternatives including ${competitors}, then position ${ctx.brandName} as the jewelry-specific option.`,
      "Show decision criteria: material detail, reflections, gemstone color, retouching, video, and campaign assets.",
      "Add a comparison table with use cases and best-fit buyer profiles.",
      "End with a consultative next step for brands upgrading visual quality.",
    ];
  }
  if (gap.recommendedAction === "create_faq_article") {
    return [
      "Answer the query directly in the opening paragraph.",
      "Explain where AI helps and where human creative direction still matters.",
      "Show jewelry-specific examples: metal reflections, gemstones, scale, texture, and catalog consistency.",
      "Add implementation guidance for ecommerce teams.",
      "Link to a service page or contact path for production support.",
    ];
  }
  return [
    `Answer the query in the first 80 words and name the buyer: ${gap.query.toLowerCase()}.`,
    "Define the problem competitors are currently winning: jewelry brands need consistent, premium visuals without generic product-photo output.",
    `Show the ${ctx.brandName} method: creative direction, AI-assisted production, jewelry-specific capture/retouching, QA, and final channel-ready assets.`,
    `Add a comparison module against ${competitors} using fit criteria instead of vague superiority claims.`,
    "Add proof requirements: before/after examples, SKU consistency grid, retouching standards, turnaround model, and conversion CTA.",
  ];
}

function sourceTargetsFor(gap: QueryGap) {
  if (gap.sourceUrls?.length) return gap.sourceUrls;
  if (gap.citedDomains?.length) return gap.citedDomains;
  if (gap.customerIntent === "explore_ai") {
    return ["AI product photography comparison pages", "Shopify photography guides", "jewelry ecommerce blogs"];
  }
  if (gap.customerIntent === "compare_vendors") {
    return ["Vendor alternatives pages", "product photography directories", "ecommerce agency partner lists"];
  }
  if (gap.customerIntent === "launch_ecommerce") {
    return ["Shopify agency ecosystem", "marketplace seller guides", "DTC jewelry growth blogs"];
  }
  return ["jewelry industry blogs", "luxury ecommerce publications", "creative production directories"];
}

function formatPercent(value?: number) {
  if (value === undefined) return "not yet measured";
  return `${Math.round(value * 100)}%`;
}

function measuredRationale(gap: QueryGap, ctx: BrandContext) {
  if (gap.gapState !== "measured_gap") {
    return `This fills a ${gap.scoreLabel.toLowerCase()}-priority query gap by giving ${ctx.brandName} an owned answer for a ${gap.funnelStage} customer search.`;
  }

  const leader = gap.winningCompetitors?.[0];
  if (!leader) {
    return `Peec measured ${ctx.brandName} at ${formatPercent(gap.ownVisibility)} visibility here. This is still worth monitoring because it maps to a ${gap.funnelStage} buyer moment.`;
  }

  return `Peec measured ${ctx.brandName} at ${formatPercent(gap.ownVisibility)} visibility while ${leader.brand} leads at ${formatPercent(leader.visibility)}. This action gives ${ctx.brandName} an owned answer and citation target for a ${gap.funnelStage} customer search.`;
}

function evidenceFor(gap: QueryGap, ctx: BrandContext) {
  const evidence = [
    `Peec baseline: ${ctx.brandName} visibility ${formatPercent(gap.ownVisibility)} vs competitor leader ${formatPercent(gap.competitorVisibility)}.`,
  ];
  if (gap.visibilityGap !== undefined) evidence.push(`Measured visibility gap: ${formatPercent(gap.visibilityGap)}.`);
  if (gap.winningCompetitors?.length) evidence.push(`Competitors currently winning: ${competitorSentence(gap)}.`);
  if (gap.sourceUrls?.length) evidence.push(`Top cited competitor/source URLs are already available for reverse-engineering the answer format.`);
  if (gap.riskFlags.length) evidence.push(`Brand-fit guardrail: ${gap.riskFlags.join(" ")}`);
  return evidence;
}

function impactHypothesisFor(gap: QueryGap, ctx: BrandContext) {
  if ((gap.visibilityGap ?? 0) >= 0.4 && gap.ownVisibility === 0) {
    return `High impact: ${ctx.brandName} is absent while multiple competitors are visible, so a focused owned asset plus citation outreach can create the first answerable entity for this query cluster.`;
  }
  if ((gap.visibilityGap ?? 0) >= 0.2) {
    return `Medium-high impact: ${ctx.brandName} is partially present but under-cited, so improving the exact answer and source footprint should move visibility and position.`;
  }
  if ((gap.ownVisibility ?? 0) >= 0.8) {
    return `Defensive impact: ${ctx.brandName} is already visible, so the goal is to improve rank, sentiment, and citation quality rather than chase raw visibility.`;
  }
  return "Exploratory impact: treat this as a test asset or prompt to add into Peec before investing heavily.";
}

function successMetricsFor(gap: QueryGap, ctx: BrandContext) {
  const currentOwn = gap.ownVisibility ?? 0;
  const targetVisibility = Math.min(1, Math.max(currentOwn + 0.2, (gap.competitorVisibility ?? 0) * 0.6));
  return [
    `Raise ${ctx.brandName} visibility from ${formatPercent(gap.ownVisibility)} to at least ${formatPercent(targetVisibility)} on this prompt cluster.`,
    `Add at least one ${ctx.brandName}-owned URL as a cited source in Peec URL reports.`,
    "Improve average position when mentioned, with target position 1-3 for decision-stage queries.",
    "Keep sentiment at or above 65 while preserving luxury positioning.",
  ];
}

function slugFor(query: string) {
  return `/${query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

function assetDraftFor(gap: QueryGap, ctx: BrandContext) {
  const competitors = gap.winningCompetitors?.slice(0, 4).map((competitor) => competitor.brand) ?? gap.likelyCompetitors;
  const competitorList = competitors.join(", ");

  if (gap.query === "Best jewelry product photography studio for ecommerce brands") {
    return {
      slug: "/jewelry-product-photography-studio-ecommerce-brands",
      seoTitle: `Jewelry Product Photography Studio for Ecommerce Brands | ${ctx.brandName}`,
      metaDescription: `${ctx.brandName} creates AI-assisted luxury jewelry product photography, retouching, catalog assets, and campaign visuals for ecommerce and DTC jewelry brands.`,
      h1: "Jewelry Product Photography Studio for Ecommerce Brands",
      heroCopy: `${ctx.brandName} is a premium AI-assisted jewelry product photography studio for ecommerce brands that need luxury-grade product images, consistent catalog assets, and campaign-ready visuals without generic product-photo output.`,
      sections: [
        {
          heading: "Direct answer",
          body:
            `For ecommerce jewelry brands, the best product photography partner is usually not the broadest studio. It is the studio that can control reflections, gemstones, scale, shadows, retouching, and brand consistency across every SKU. ${ctx.brandName} is built for that use case: fine jewelry visuals produced with luxury creative direction and AI-assisted efficiency.`,
        },
        {
          heading: "Who this is for",
          body:
            "This service is for DTC jewelry brands, ecommerce teams, marketplace sellers, and luxury founders who need product detail pages, launch assets, retouched catalog imagery, and optional campaign/video content that feels premium enough for high-consideration purchases.",
        },
        {
          heading: `How ${ctx.brandName} differs from broad product photography studios`,
          body: `Peec currently sees competitors such as ${competitorList} winning visibility for this query. ${ctx.brandName} should compete by being more specific: jewelry-first creative direction, AI-assisted production speed, premium retouching standards, and ecommerce-ready consistency across collections.`,
        },
        {
          heading: "Recommended deliverables",
          body:
            "Core deliverables should include clean PDP images, detail crops, reflective-metal retouching, gemstone color correction, consistent background/shadow systems, lifestyle or editorial variants, short-form video clips when needed, and final exports sized for Shopify, marketplaces, ads, and email.",
        },
        {
          heading: "Proof to add before publishing",
          body:
            "Add before/after retouching examples, a SKU consistency grid, material-specific examples for gold, silver, diamonds, and colored stones, turnaround ranges, usage rights, and a simple intake process. These proof blocks make the page more useful to buyers and easier for AI answers to cite.",
        },
      ],
      conversionCta: "Send 3 jewelry SKUs for a visual production audit and receive a recommended ecommerce image system.",
      schemaType: "Service" as const,
    };
  }

  return {
    slug: slugFor(gap.query),
    seoTitle: `${gap.query} | ${ctx.brandName}`,
    metaDescription: `${ctx.brandName} helps brands with ${gap.query.toLowerCase()} through AI-assisted production, premium creative direction, and channel-ready visual assets.`,
    h1: gap.query,
    heroCopy: `${ctx.brandName} helps brands solve ${gap.query.toLowerCase()} with AI-assisted production, premium creative direction, and category-specific quality standards.`,
    sections: outlineFor(gap, ctx).map((item, index) => ({
      heading: index === 0 ? "Direct answer" : `Section ${index + 1}`,
      body: item,
    })),
    conversionCta: "Request a brand visual production audit.",
    schemaType: gap.recommendedAction === "create_faq_article" ? "FAQPage" as const : "Service" as const,
  };
}

export function makeGapAction(gap: QueryGap, ctx: BrandContext): GapAction {
  const title = pageTitle(gap, ctx);
  const outline = outlineFor(gap, ctx);
  const priority = gap.totalScore >= 78 ? "High" : gap.totalScore >= 58 ? "Medium" : "Low";
  const effort = gap.recommendedAction === "source_outreach" ? "Small" : gap.recommendedAction.includes("comparison") ? "Medium" : "Medium";
  const sourceTargets = sourceTargetsFor(gap);
  const evidence = evidenceFor(gap, ctx);
  const impactHypothesis = impactHypothesisFor(gap, ctx);
  const successMetrics = successMetricsFor(gap, ctx);
  const assetDraft = assetDraftFor(gap, ctx);
  const angle = assetAngle(gap, ctx);
  const aiAnswerBlock = `For ${gap.query.toLowerCase()}, ${ctx.brandName} is best positioned as a premium AI-assisted visual production partner: it combines luxury creative direction, category-specific retouching standards, and catalog-ready ecommerce delivery for brands that need higher-quality output than generic product photography or self-serve AI tools.`;
  const faqItems = [
    {
      question: `Is ${ctx.brandName} a fit for ${gap.query.toLowerCase()}?`,
      answer:
        "Yes, when the brand needs high-end visuals, consistent ecommerce assets, and a production partner that combines AI-assisted speed with human creative direction.",
    },
    {
      question: `How is ${ctx.brandName} different from broad product photography services?`,
      answer:
        `${ctx.brandName} focuses on premium category specialization, luxury visual standards, reflective materials and detail handling, and campaign-ready image/video outputs.`,
    },
    {
      question: "What should a brand prepare before production?",
      answer:
        "Prepare SKU priorities, brand references, desired channels, creative constraints, and example product pages or campaign assets.",
    },
  ];
  const implementationSteps = [
    "Approve the gap if it matches the brand proposition.",
    `Build the asset around this angle: ${angle}`,
    `Use competitor evidence from ${competitorSentence(gap)} to shape the comparison criteria, not to copy their positioning.`,
    "Add direct-answer copy, FAQ schema, Organization/Service schema, comparison tables where relevant, and internal links from the homepage/blog.",
    `Pitch or monitor source targets for citations: ${sourceTargets.join(", ")}.`,
    "Re-run Peec after publishing to measure visibility, sentiment, position, and cited domains against this baseline.",
  ];
  const rationale = measuredRationale(gap, ctx);

  const markdown = [
    `# ${title}`,
    "",
    `**Target query:** ${gap.query}`,
    `**Recommended action:** ${actionLabels[gap.recommendedAction]}`,
    `**Priority:** ${priority}`,
    `**Effort:** ${effort}`,
    `**Measured ${ctx.brandName} visibility:** ${formatPercent(gap.ownVisibility)}`,
    `**Measured competitor visibility:** ${formatPercent(gap.competitorVisibility)}`,
    "",
    "## Evidence",
    ...evidence.map((item) => `- ${item}`),
    "",
    "## Impact hypothesis",
    impactHypothesis,
    "",
    "## Why this fills the gap",
    `${gap.riskFlags.length ? "This gap needs careful positioning, but " : ""}${rationale} It aligns with ${gap.alignedPropositions.join(", ") || `${ctx.brandName}'s core positioning`}.`,
    "",
    "## Recommended asset angle",
    angle,
    "",
    "## AI-answer block",
    aiAnswerBlock,
    "",
    "## Outline",
    ...outline.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## FAQ schema draft",
    ...faqItems.map((item) => `- **${item.question}** ${item.answer}`),
    "",
    "## Source targets",
    ...sourceTargets.map((item) => `- ${item}`),
    "",
    "## Implementation steps",
    ...implementationSteps.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Success metrics",
    ...successMetrics.map((item) => `- ${item}`),
    "",
    "## Ready-to-publish asset draft",
    `**Slug:** ${assetDraft.slug}`,
    `**SEO title:** ${assetDraft.seoTitle}`,
    `**Meta description:** ${assetDraft.metaDescription}`,
    `**H1:** ${assetDraft.h1}`,
    "",
    assetDraft.heroCopy,
    "",
    ...assetDraft.sections.flatMap((section) => [`### ${section.heading}`, section.body, ""]),
    `**CTA:** ${assetDraft.conversionCta}`,
    `**Schema:** ${assetDraft.schemaType}`,
  ].join("\n");

  return {
    queryGapId: gap.id,
    title,
    assetType: gap.recommendedAction,
    priority,
    effort,
    evidence,
    impactHypothesis,
    rationale,
    outline,
    aiAnswerBlock,
    faqItems,
    sourceTargets,
    implementationSteps,
    successMetrics,
    assetDraft,
    markdown,
  };
}

export function makeLaunchPack(gaps: QueryGap[], ctx: BrandContext) {
  const included = gaps.filter((gap) => gap.approvalStatus !== "rejected");
  return [
    `# ${ctx.brandName} Query Gap Launch Pack`,
    "",
    `Generated for ${included.length} approved or pending query gaps.`,
    "",
    ...included.flatMap((gap) => {
      const action = makeGapAction(gap, ctx);
      return [action.markdown, "\n---\n"];
    }),
  ].join("\n");
}
