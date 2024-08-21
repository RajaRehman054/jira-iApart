var axios = require('axios');
const { GraphQLClient, gql } = require('graphql-request');
var xrayEndpoint = ' https://xray.cloud.getxray.app/api/v2';

// !Function to fetch Xray token
const fetchXrayToken = async () => {
	const authData = {
		client_id: 'C991A7C420F64469A7C564F8EDD245A0',
		client_secret:
			'e1762a3655ac05acbd75383761d95521d05e1a43f304115179d43b8f8b84b624',
	};

	try {
		const response = await axios.post(
			`${xrayEndpoint}/authenticate`,
			authData,
			{
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
		const token = response.data.replace(/"/g, '');
		return token;
	} catch (error) {
		console.error('Error fetching token:', error);
	}
};

const getTestExecutions = async issueKey => {
	const token = await fetchXrayToken();

	try {
		const endpoint = 'https://xray.cloud.getxray.app/api/v2/graphql';
		const client = new GraphQLClient(endpoint, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});

		// Define the GraphQL query
		const query = gql`
			{
				getTest(issueId: "16688") {
					issueId
					testType {
						name
						kind
					}
					steps {
						id
						data
						action
						result
						attachments {
							id
							filename
						}
					}
				}
			}
		`;

		// Send the request and get the response
		const data = await client.request(query);
		console.log(data);
	} catch (error) {
		if (error.response && error.response.status === 404) {
			console.error(
				'Error: 404 Not Found. Please verify the issue key and the API endpoint.'
			);
		} else {
			console.error(error);
			console.error(
				'Error fetching test cases:',
				error.response ? error.response.data : error.message
			);
		}
	}
};

getTestExecutions('IAPTS-16520');
