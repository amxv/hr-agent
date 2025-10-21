export type PricingConfig = {
  currency?: string;
  free?: {
    name: string;
    summary: string;
  };
  pro?: {
    name: string;
    monthlyPrice: number;
    summary: string;
  };
};

export type SiteConfig = {
  githubUrl: string;
  appPrefix: string;
  appName: string;
  organization: {
    name: string;
    contact: {
      privacyEmail: string;
      legalEmail: string;
    };
  };
  services: {
    hosting: string;
    aiProviders: string[];
    paymentProcessors: string[];
  };
  pricing?: PricingConfig;
  legal: {
    minimumAge: number;
    governingLaw: string;
    refundPolicy: string;
  };
  policies: {
    privacy: {
      title: string;
      lastUpdated?: string;
    };
    terms: {
      title: string;
      lastUpdated?: string;
    };
  };
};

export const siteConfig: SiteConfig = {
  githubUrl: "https://github.com/amxv/agentdune-chat",
  appPrefix: "agentdune",

  appName: "AgentDune Chat",
  organization: {
    name: "AgentDune Chat Ltd",
    contact: {
      privacyEmail: "privacy@agentdune.com",
      legalEmail: "legal@agentdune.com",
    },
  },
  services: {
    hosting: "Vercel",
    aiProviders: [
      "OpenAI",
      "Anthropic",
      "xAI",
      "Google",
      "Meta",
      "Mistral",
      "Alibaba",
      "Amazon",
      "Cohere",
      "DeepSeek",
      "Perplexity",
      "Vercel",
      "Inception",
      "Moonshot",
      "Morph",
      "ZAI",
    ],
    paymentProcessors: [],
  },
  legal: {
    minimumAge: 13,
    governingLaw: "United States",
    refundPolicy: "no-refunds",
  },
  policies: {
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "July 24, 2025",
    },
    terms: {
      title: "Terms of Service",
      lastUpdated: "July 24, 2025",
    },
  },
};
