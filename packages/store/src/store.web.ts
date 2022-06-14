import { LoadedItem, PersistStore, StructureType } from './types';

type ObjKey<T extends Record<string, T[keyof T]>> = {
  type: StructureType;
  autoIncrement?: boolean;
  initData: LoadedItem<keyof T, T[keyof T]>;
  keyPath?: string | string[] | null;
  name: keyof T;
};

type DataAndSubs<T extends Record<keyof T, T[keyof T]>> = {
  data: LoadedItem<keyof T, T[keyof T]>;
  subscribers: Array<(val: LoadedItem<keyof T, T[keyof T]>) => void>;
  persistStore: PersistStore<T>;
};

type WeakStore<T extends Record<string, T[keyof T]>> = WeakMap<
  ObjKey<T>,
  DataAndSubs<T>
  >;

export class StoreWeb<T extends Record<string, T[keyof T]>> {
  /**
   * Структура хранилища должна оставаться неизменной все время
   * Здесь должен храниться необходимый минимум данных о структуре таблиц в базе данных
   */
  private structure: Map<keyof T, ObjKey<T>>;

  /**
   * Название хранилища
   */
  private name: string;

  /**
   * Это хранилище в оперативной памяти. Очищается когда никто больше не подписан на эти данные
   */
  private weakStore: WeakStore<T>;

  private getDataKey(name: keyof T): ObjKey<T> {
    return this.structure.get(name);
  }
  private setData(key: keyof T, data: Omit<LoadedItem<keyof T, T[keyof T]>, 'id'>, subscribers: Array<(val: LoadedItem<keyof T, T[keyof T]>) => void>, persistStore: PersistStore<T>): void {
    this.weakStore.set(this.getDataKey(key), {
      data: {
        id: key,
        ...data,
      },
      persistStore,
      subscribers,
    });
  }
  private hasData(key: keyof T): boolean {
    return this.weakStore.has(this.getDataKey(key));
  }
  private getData(key: keyof T): DataAndSubs<T> {
    return this.weakStore.get(this.getDataKey(key));
  }
  private deleteData(key: keyof T): void {
    let keyPointer = this.getDataKey(key);
    this.weakStore.delete(keyPointer);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    keyPointer = null;
  }

  constructor(name: string) {
    this.name = name;
    // TODO: возможно, здесь лучше использовать обычный Map
    this.weakStore = new WeakMap() as WeakStore<T>;
    this.structure = new Map();
  }

  public addItem(key: keyof T, initData: Partial<T[keyof T]> = {}): void {
    this.structure.set(key, {
      initData: {
        data: initData,
        id: key,
        loadingStatus: {
          error: undefined,
          isLoaded: false,
          isLoading: false,
        },
      },
      keyPath: 'id',
      name: key,
      type: StructureType.ITEM,
    });
  }

  public async subscribe(
    key: keyof T,
    subscriber: (value: LoadedItem<keyof T, T[keyof T]>) => void,
    persistStore: PersistStore<T>,
  ): Promise<void> {
    if (this.hasData(key)) {
      const curData = this.getData(key);
      curData.subscribers.push(subscriber);
      subscriber(curData.data);
    } else {
      // 1. Восстанавливаем данные
      let data = await persistStore.getItem(key);

      if (typeof data === 'undefined') {
        // 2. Если не удалось восстановить, создаем новые из начальных значений
        const keyData = this.getDataKey(key);
        data = keyData.initData;
      }

      this.setData(key, data, [subscriber], persistStore);
      subscriber(data);
    }
  }

  public async unsubscribe(
    key: keyof T,
    subscriber: (value: LoadedItem<keyof T, T[keyof T]>) => void,
  ): Promise<void> {
    if (this.hasData(key)) {
      const curData = this.getData(key);

      const subscriberRemoveIndex = curData.subscribers.findIndex(
        (el) => el === subscriber,
      );
      if (subscriberRemoveIndex !== -1) {
        curData.subscribers.splice(subscriberRemoveIndex, 1);
      }

      if (!curData.subscribers?.length) {
        await curData.persistStore.setItem(key, curData.data);
        this.deleteData(key);
      }
    }
  }

  public async updateData(key: keyof T, getData: (data: LoadedItem<keyof T, T[keyof T]>) => LoadedItem<keyof T, T[keyof T]>, persistStore: PersistStore<T>,) {
    if (this.hasData(key)) {
      const curData = this.getData(key);
      const newData = getData(curData.data);

      this.setData(key, newData, curData.subscribers, curData.persistStore);
      // Разослать данные всем подписчикам
      console.log('newData', newData);
      curData.subscribers.forEach((subscriber) => subscriber(newData));
    } else {
      const prevData = await persistStore.getItem(key);
      const dataKey = this.getDataKey(key);
      await persistStore.setItem(key, getData(prevData?.data || dataKey.initData));
    }
  }
}
