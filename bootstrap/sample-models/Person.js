import { Address } from './Address';
export const Person = {
	id: Number,
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	address: Address
};
