var { axios } = require('./axiosConfig');
var ExcelJS = require('exceljs');

// !Function to fetch projects from Jira
const fetchProjects = async () => {
	try {
		const response = await axios.get(`/rest/api/3/project`);
		const data = await response.data;
		return data;
	} catch (error) {
		console.error('Error fetching projects:', error.response.data);
		throw error;
	}
};

// !Function to fetch boards of projects
const fetchBoardId = async (projectKey, boardName) => {
	try {
		const response = await axios.get(
			`/rest/agile/1.0/board?projectKeyOrId=${projectKey}`
		);
		const data = await response.data;
		let boardId;

		if (data.values.length > 0) {
			data.values.forEach(element => {
				if (element.name === boardName) {
					boardId = element.id;
				}
			});
			return boardId;
		} else {
			return;
		}
	} catch (error) {
		console.error('Error fetching board ID:', error.response.data);
		throw error;
	}
};

// !Function to fetch expired sprints from a project
const fetchExpiredSprints = async boardId => {
	try {
		let allSprints = [];
		let startAt = 0;
		const maxResults = 50;

		while (true) {
			const response = await axios.get(
				`/rest/agile/1.0/board/${boardId}/sprint?state=closed`,
				{
					params: {
						startAt: startAt,
						maxResults: maxResults,
					},
				}
			);
			const data = response.data;
			allSprints = allSprints.concat(data.values);

			if (startAt + maxResults < data.total) {
				startAt += maxResults;
			} else {
				break;
			}
		}

		if (allSprints.length > 0) {
			latestExpiredSprint = allSprints.reverse()[0];
		}

		return latestExpiredSprint;
	} catch (error) {
		console.error('Error fetching expired sprints:', error.response.data);
		throw error;
	}
};

// !Function to fetch issues from sprint
const fetchIssuesFromSprint = async sprintId => {
	try {
		let allIssues = [];
		let startAt = 0;
		const maxResults = 50;

		while (true) {
			const response = await axios.get(
				`/rest/agile/1.0/sprint/${sprintId}/issue`,
				{
					params: {
						startAt: startAt,
						maxResults: maxResults,
					},
				}
			);
			const data = response.data;
			allIssues = allIssues.concat(data.issues);

			if (startAt + maxResults < data.total) {
				startAt += maxResults;
			} else {
				break;
			}
		}
		return allIssues;
	} catch (error) {
		console.error(
			'Error fetching issues from sprint:',
			error.response.data
		);
		throw error;
	}
};

// !Function to fetch issue history from Jira API
const fetchIssueHistory = async issueKey => {
	try {
		const response = await axios.get(
			`/rest/api/3/issue/${issueKey}?expand=changelog`
		);
		const data = await response.data;
		const histories = data.changelog.histories;
		return histories;
	} catch (error) {
		console.error('Error fetching issue history:', error.response.data);
		throw error;
	}
};

// !Function to dump data into csv file
const createCSV = async (data, mainDetails, developers, qa) => {
	try {
		const project = data[0].project;
		const workbook = new ExcelJS.Workbook();
		const sheet = workbook.addWorksheet(`${data[0].sprint}`);

		const desiredHeaderOrder = [
			'sprint',
			'issue',
			'issue_type',
			'issue_point',
			'status',
			'reporter',
			'Developer',
			'QA Engineer',
			'In Progress',
			'QA',
			'QA_KB',
			'UAT',
			'UAT_KB',
			'testCases',
			'sprintChanges',
			'lastState',
		];

		sheet.addRow(desiredHeaderOrder);
		data.forEach(rowData => {
			if (rowData.lastState !== 'Obsolete') {
				const row = [];
				desiredHeaderOrder.forEach(key => {
					if (key === 'sprintChanges') {
						let str = '';
						if (rowData[key]) {
							str = includeOnlyOnce(rowData[key]);
						}
						row.push(str);
					} else {
						row.push(rowData[key] || '');
					}
				});
				sheet.addRow(row);
			}
		});
		sheet.addRow([]);

		sheet.addRow(['Parameters', 'Value']);
		Object.keys(mainDetails).forEach(key => {
			sheet.addRow([key, mainDetails[key]]);
		});
		sheet.addRow([]);

		sheet.addRow(['Developers', 'Avg Time', 'QA_KB', 'UAT_KB']);
		Object.keys(developers).forEach(key => {
			sheet.addRow([
				key,
				developers[key].avgTime,
				developers[key].qaKB,
				developers[key].uatKB,
			]);
		});
		sheet.addRow([]);

		sheet.addRow(['Qa Engineer', 'Avg Time', 'QA_KB']);
		Object.keys(qa).forEach(key => {
			sheet.addRow([key, qa[key].avgTime, qa[key].qaKB]);
		});

		await workbook.csv.writeFile(`output/${project}.csv`);
		console.log('\nCSV file created successfully.\n');
	} catch (error) {
		console.error('Error occurred while creating CSV file:', error);
	}
};

//? parser
const includeOnlyOnce = str => {
	const arr = str.split(',').map(item => item.trim());
	const uniqueSet = new Set(arr);
	const uniqueArray = Array.from(uniqueSet).sort();
	const arr2 = uniqueArray.join(' ').split(' ');
	const uniqueSet2 = new Set(arr2);
	const uniqueArray2 = Array.from(uniqueSet2).sort();
	return uniqueArray2.join(' ');
};

module.exports = {
	fetchProjects,
	fetchBoardId,
	fetchExpiredSprints,
	fetchIssuesFromSprint,
	fetchIssueHistory,
	createCSV,
};
