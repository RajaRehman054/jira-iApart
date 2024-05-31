const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: './dotenv/.env' });

const instance = axios.create({
	baseURL: `${process.env.BASE_URL}`,
	headers: {
		Authorization: `Basic ${Buffer.from(
			`${process.env.EMAIL}:${process.env.API_TOKEN}`
		).toString('base64')}`,
	},
});

module.exports = { axios: instance };
