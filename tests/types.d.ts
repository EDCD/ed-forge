import { IShipObject } from '../src/Ship';

export interface TestSuite {
  name: string,
  build: IShipObject,
}

export type TestSuites = TestSuite[];
