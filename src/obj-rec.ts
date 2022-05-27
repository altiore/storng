export type Rec<K, D> = {
	key(): K;
	init(): D;
};

export class ObjRec<K, D> implements Rec<K, D> {
	constructor(name: K, init: D) {
		this.name = name;
		this.initData = init;
	}

	private readonly initData: D;
	private readonly name: K;

	key(): K {
		return this.name;
	}

	init(): D {
		return this.initData;
	}
}
