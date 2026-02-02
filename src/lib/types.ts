export interface Link {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  collectionId: string;
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
  order: number;
}
