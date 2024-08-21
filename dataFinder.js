var {
	fetchBoardId,
	fetchProjects,
	fetchExpiredSprints,
	fetchIssuesFromSprint,
	fetchIssueHistory,
} = require('./helperFunctions');

const dataFinder = async () => {
	try {
		const projects = await fetchProjects();
		let finalData = [];
		let notImp = ['Test Plan', 'Task', 'Test', 'Test Execution'];

		for (const project of projects) {
			const boardIds = await fetchBoardId(project.key);

			if (boardIds) {
				for (let index = 0; index < boardIds.length; index++) {
					if (boardIds[index] === 16 && project.key === 'IAPTS') {
						const sprint = await fetchExpiredSprints(
							boardIds[index]
						);

						if (sprint) {
							const issues = await fetchIssuesFromSprint(
								sprint.id
							);

							for (const issue of issues) {
								if (
									!notImp.includes(
										issue.fields.issuetype.name
									)
								) {
									const issueKey = issue.key;
									const issueHistory =
										await fetchIssueHistory(issueKey);
									const timeInProgress =
										await calculateTimeSpentInStatus(
											issueHistory.reverse(),
											sprint.name,
											issueKey
										);

									let object = {
										project: project.name,
										sprint: sprint.name,
										issue: issueKey,
										issue_type: issue.fields.issuetype.name,
										reporter:
											issue.fields.reporter.displayName,
										issue_point: timeInProgress.point
											? timeInProgress.point
											: issue.fields.customfield_10024,
									};
									delete timeInProgress.point;
									object = { ...object, ...timeInProgress };
									finalData.push(object);
								}
							}
						}
					}
				}
			}
		}
		return finalData;
	} catch (error) {
		console.error('An error occurred:', error);
	}
};

// !Function to calculate the time spent in a particular status
const calculateTimeSpentInStatus = async (issueHistory, key, issueKey) => {
	let mainData = {
		QA_KB: 0,
		UAT_KB: 0,
		status: 'done',
		sprintChanges: '',
		lastState: '',
		testCases: 0,
	};
	var data = [];

	issueHistory.forEach(entry => {
		for (const item of entry.items) {
			if (item.field === 'Developer') {
				mainData['Developer'] = item.toString;
			}
			if (item.field === 'Story Points') {
				mainData['point'] = Number(item.toString);
			}
			if (item.field === 'QA Engineer') {
				mainData['QA Engineer'] = item.toString;
			}
			if (item.field === 'Sprint') {
				const items = item.toString.split(',').map(item => item.trim());
				const lastItem = items[items.length - 1];
				const isEqual = lastItem === key;
				if (isEqual) {
					mainData.status = 'done';
				} else {
					mainData.status = 'not-done';
				}
				mainData.sprintChanges = `${mainData.sprintChanges} ${item.toString}`;
			}
			if (item.field === 'status') {
				// if (issueKey === 'IAPTS-13471') {
				// 	console.log(entry.created, item);
				// }
				mainData.lastState = item.toString;
				let obj = item;
				if (item.toString === 'QA Ready') {
					obj = { ...item, toString: 'QA' };
				}
				if (item.fromString === 'QA Ready') {
					obj = { ...item, fromString: 'QA' };
				}
				data.push({
					dated: entry.created,
					item: obj,
				});
				if (item.toString === 'QA Rejected') {
					mainData['QA_KB'] += 1;
				}
				if (item.toString === 'UAT Rejected') {
					mainData['UAT_KB'] += 1;
				}
			}
			if (item.field === 'Link') {
				let toString = item.toString;
				if (toString && toString.includes(' by ')) {
					if (issueKey === 'IAPTS-16158') {
						console.log(entry.created, item);
					}
					const parts = toString.split(' by ');
					const before = parts[0].trim();
					const after = parts[1] ? parts[1].trim() : '';
					if (before === 'This issue is tested') {
						mainData.testCases += 1;
					}
				}
			}
		}
	});
	if (data.length > 0) {
		const { InProgress, UAT, QA } = calculateDaysInStates(data, issueKey);
		mainData['In Progress'] = InProgress;
		mainData['QA'] = QA;
		mainData['UAT'] = UAT;
	}

	return mainData;
};

const relevantStates = new Set(['In Progress', 'QA', 'UAT']);

const extractDate = entry => {
	return new Date(entry.split('T')[0]);
};

const addDays = (date, days) => {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
};

const isWeekend = date => {
	const day = date.getDay();
	return day === 0 || day === 6;
};

const calculateDaysInStates = (data, issueKey) => {
	const dateStates = {};
	const stateDays = { 'In Progress': 0, QA: 0, UAT: 0 };

	// Populate the dateStates dictionary
	data.forEach(record => {
		const date = extractDate(record.dated);
		const fromState = record.item.fromString;
		const toState = record.item.toString;
		const dateString = date.toISOString().split('T')[0];

		if (!dateStates[dateString]) {
			dateStates[dateString] = { states: new Set(), lastState: null };
		}

		if (relevantStates.has(fromState)) {
			dateStates[dateString].states.add(fromState);
		}
		if (relevantStates.has(toState)) {
			dateStates[dateString].states.add(toState);
		}
		dateStates[dateString].lastState = toState;
	});

	// Fill in the gaps for consecutive dates in the same state
	const dates = Object.keys(dateStates).sort();
	for (let i = 0; i < dates.length - 1; i++) {
		const current = new Date(dates[i]);
		const next = new Date(dates[i + 1]);
		const lastState = dateStates[dates[i]].lastState;
		if (
			lastState &&
			relevantStates.has(lastState) &&
			next - current > 86400000
		) {
			let tempDate = addDays(current, 1);
			while (tempDate < next) {
				if (!isWeekend(tempDate)) {
					const dateString = tempDate.toISOString().split('T')[0];
					if (!dateStates[dateString]) {
						dateStates[dateString] = {
							states: new Set(),
							lastState: null,
						};
					}
					dateStates[dateString].states.add(lastState);
				}
				tempDate = addDays(tempDate, 1);
			}
		}
	}

	// Assign points based on rules
	Object.keys(dateStates).forEach(date => {
		const dateObj = new Date(date);
		if (!isWeekend(dateObj)) {
			const states = dateStates[date].states;
			if (states.size === 1) {
				states.forEach(state => {
					stateDays[state] += 1;
				});
			} else if (states.size === 2) {
				states.forEach(state => {
					stateDays[state] += 0.5;
				});
			} else if (states.size === 3) {
				states.forEach(state => {
					stateDays[state] += 0.3;
				});
			}
		}
	});

	return {
		InProgress: stateDays['In Progress'],
		QA: stateDays['QA'],
		UAT: stateDays['UAT'],
	};
};

module.exports = { dataFinder };
