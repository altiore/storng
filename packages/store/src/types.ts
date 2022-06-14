export interface LoadedItem<Key, Data extends Record<string, any>> {
  id: Key;

  data: Partial<Data>;

  loadingStatus: {
    error?: any;
    isLoading: boolean;
    isLoaded: boolean;
  };
}

export type PersistStore<T extends Record<keyof T, T[keyof T]>> = {
  getItem: (key: keyof T) => Promise<any>;
  setItem: (key: keyof T, value: any) => Promise<void>;
};

export enum StructureType {
  ITEM = 'item',
  LIST = 'list',
}
