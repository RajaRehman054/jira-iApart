var { mainFunc } = require('./main');

mainFunc();
// const axios = require('axios');

// Jira API credentials and URL
// const jiraUrl = 'https://iapts.atlassian.net';
// const jiraAuthToken =
// 	'ATATT3xFfGF0Fr42XjkVzUdkS1pCnV9Lq3J1tpfkjd0bMEZGbHcnFh9__X_T0busDtxGZ6AwroqnPV1DWjzp9_UVFCYSAPoROp5sjHAOtY_wk9qcxQkbvlD7l17Mi7IKtzhJ-dnQrWiWCNe594gbOqJ7IZOAGwSn3TShoFADvEMhHWz8q20vcEs=27C1AAA5'; // Store securely
// const jiraEmail = 'harris.m@dplit.com'; // Your Jira email
// const assigneeEmail = 'curtis@iapts.com';

// async function getAccountIdByEmail(email) {
// 	const searchUrl = `${jiraUrl}/rest/api/3/user/search?query=${email}`;

// 	try {
// 		const response = await axios({
// 			method: 'get',
// 			url: searchUrl,
// 			headers: {
// 				Authorization: `Basic ${Buffer.from(
// 					`${jiraEmail}:${jiraAuthToken}`
// 				).toString('base64')}`,
// 				'Content-Type': 'application/json',
// 			},
// 		});

// 		const users = response.data;
// 		if (users.length > 0) {
// 			console.log(users[0].accountId);
// 			return users[0].accountId;
// 		} else {
// 			throw new Error('No user found with the specified email address');
// 		}
// 	} catch (error) {
// 		console.error(
// 			'Error fetching accountId by email:',
// 			error.response ? error.response.data : error.message
// 		);
// 	}
// }

// getAccountIdByEmail(assigneeEmail);
