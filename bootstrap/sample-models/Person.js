import { Address } from './Address';
export const Person = {
	id: Number,
	firstname: { type: String, required: true },
	lastname: { type: String, required: true },
	address: Address,
	fullname: {
		type: Function,
		get: function () {
			return this.firstname + ' ' + this.lastname;
		}
	}
};
