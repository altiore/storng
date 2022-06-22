import {createContext} from 'react';

import {Store} from '@storng/store';

export const StoreContext = createContext<Store<any>>({} as any);
