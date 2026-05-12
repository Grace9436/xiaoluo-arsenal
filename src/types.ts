export type Tool = {
  id: string;
  title: string;
  description: string;
  addedDate: string;
  url: string;
  domain: string;
  cover: string;
  category: string;
  subcategory?: string;
  tags: string[];
  note?: string;
};

export type Category = {
  id: string;
  name: string;
  count: number;
  children?: Category[];
  icon: string;
};

export type SiteStats = {
  date: string;
  toolCount: number;
  todayAdded: number;
  friendVisits: number;
};
