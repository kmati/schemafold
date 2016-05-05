export const Address = {
	id: Number,
	street1: { type: String, required: true },
	apt: String,
	city: { type: String, required: true },
	state: { type: String, required: true },
	zip: String
};
