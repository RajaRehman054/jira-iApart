var { dataFinder } = require('./dataFinder');
const { createCSV } = require('./helperFunctions');

const mainFunc = async () => {
	try {
		console.log(
			'\x1b[34m%s\x1b[0m',
			'Fetching Data from Jira Apis ..................................................................'
		);

		const data = await dataFinder();

		let developers = {};
		let qaEng = {};
		let averageTime = {
			devCycleTime: 0,
			qaCycleTime: 0,
			uatCycleTime: 0,
			avgCycleTime: 0,
		};
		const cycleTimeBuckets = {
			'1-2': { count: 0, dev: 0, qa: 0, uat: 0, total: 0 },
			3: { count: 0, dev: 0, qa: 0, uat: 0, total: 0 },
			5: { count: 0, dev: 0, qa: 0, uat: 0, total: 0 },
			'5+': { count: 0, dev: 0, qa: 0, uat: 0, total: 0 },
		};
		let carry_over = 0;
		let total_qaKickBacks = 0;
		let total_uatKickBacks = 0;
		let totalPoints = 0;
		let notCompletedPoints = 0;
		let storyPoints = 0;
		let notCompletedStoryPoints = 0;
		let bugs = 0;
		let totalTestCases = 0;
		let pbiWithoutTestCases = 0;
		let obsolete = 0;

		for (let index = 0; index < data.length; index++) {
			if (data[index].lastState === 'Obsolete') {
				obsolete += 1;
				continue;
			}
			let dev = data[index]['Developer'];
			let qa = data[index]['QA Engineer'];
			if (data[index].testCases === 0) {
				pbiWithoutTestCases += 1;
			}
			totalTestCases += data[index].testCases;

			if (data[index].issue_type === 'Story') {
				storyPoints += 1;
				if (data[index].status !== 'done') {
					notCompletedStoryPoints += 1;
				}
			}

			if (
				data[index].status === 'done' &&
				data[index].issue_type === 'Story'
			) {
				const point = data[index]?.issue_point || 0;
				const bucket = getBucket(point);
				if (bucket) {
					cycleTimeBuckets[bucket].count += 1;
					const devTime =
						(data[index]['In Progress'] || 0) +
						(data[index]['QA Ready'] || 0);
					const qaTime = data[index]['QA'] || 0;
					const uatTime = data[index]['UAT'] || 0;
					const totalTime = devTime + qaTime + uatTime;

					cycleTimeBuckets[bucket].dev += devTime;
					cycleTimeBuckets[bucket].qa += qaTime;
					cycleTimeBuckets[bucket].uat += uatTime;
					cycleTimeBuckets[bucket].total += totalTime;
				}
			}

			if (data[index].issue_type === 'Bug') {
				bugs += 1;
			}

			if (dev) {
				if (!developers.hasOwnProperty(dev)) {
					developers[dev] = {
						totalTime: 0,
						number: 0,
						qaKB: 0,
						uatKB: 0,
					};
				}
				if (data[index].status === 'done') {
					developers[dev].qaKB += data[index].QA_KB;
					developers[dev].uatKB += data[index].UAT_KB;
					developers[dev].number += 1;
					developers[dev].totalTime +=
						(data[index]['In Progress'] || 0) +
						(data[index]['QA Ready'] || 0);
				}
			}
			if (qa) {
				if (!qaEng.hasOwnProperty(qa)) {
					qaEng[qa] = { totalTime: 0, number: 0, qaKB: 0 };
				}
				if (data[index].status === 'done') {
					qaEng[qa].number += 1;
					qaEng[qa].totalTime += data[index]['QA'] || 0;
					qaEng[qa].qaKB += data[index].QA_KB;
				}
			}

			totalPoints += data[index]?.issue_point || 0;

			if (data[index].status === 'not-done') {
				carry_over += 1;
				notCompletedPoints += data[index]?.issue_point || 0;
			} else {
				total_qaKickBacks += data[index].QA_KB;
				total_uatKickBacks += data[index].UAT_KB;
				averageTime.devCycleTime +=
					(data[index]['In Progress'] || 0) +
					(data[index]['QA Ready'] || 0);
				averageTime.qaCycleTime += data[index]['QA'] || 0;
				averageTime.uatCycleTime += data[index]['UAT'] || 0;
				averageTime.avgCycleTime +=
					(data[index]['In Progress'] || 0) +
					(data[index]['QA Ready'] || 0) +
					(data[index]['QA'] || 0) +
					(data[index]['UAT'] || 0);
				data[index].avgCycleTime =
					(data[index]['In Progress'] || 0) +
					(data[index]['QA Ready'] || 0) +
					(data[index]['QA'] || 0) +
					(data[index]['UAT'] || 0);
			}
		}

		let finalNum = data.length - obsolete;

		averageTime.avgCycleTime = parseFloat(
			(averageTime.avgCycleTime / (finalNum - carry_over)).toFixed(3)
		);
		averageTime.devCycleTime = parseFloat(
			(averageTime.devCycleTime / (finalNum - carry_over)).toFixed(3)
		);
		averageTime.qaCycleTime = parseFloat(
			(averageTime.qaCycleTime / (finalNum - carry_over)).toFixed(3)
		);
		averageTime.uatCycleTime = parseFloat(
			(averageTime.uatCycleTime / (finalNum - carry_over)).toFixed(3)
		);

		let finalData = {
			...averageTime,
			averageTime__Dev_12: divideAndRound(
				cycleTimeBuckets['1-2'].dev,
				cycleTimeBuckets['1-2'].count
			),
			averageTime__QA_12: divideAndRound(
				cycleTimeBuckets['1-2'].qa,
				cycleTimeBuckets['1-2'].count
			),
			averageTime__UAT_12: divideAndRound(
				cycleTimeBuckets['1-2'].uat,
				cycleTimeBuckets['1-2'].count
			),
			averageTime__Dev_3: divideAndRound(
				cycleTimeBuckets['3'].dev,
				cycleTimeBuckets['3'].count
			),
			averageTime__QA_3: divideAndRound(
				cycleTimeBuckets['3'].qa,
				cycleTimeBuckets['3'].count
			),
			averageTime__UAT_3: divideAndRound(
				cycleTimeBuckets['3'].uat,
				cycleTimeBuckets['3'].count
			),
			averageTime__Dev_5: divideAndRound(
				cycleTimeBuckets['5'].dev,
				cycleTimeBuckets['5'].count
			),
			averageTime__QA_5: divideAndRound(
				cycleTimeBuckets['5'].qa,
				cycleTimeBuckets['5'].count
			),
			averageTime__UAT_5: divideAndRound(
				cycleTimeBuckets['5'].uat,
				cycleTimeBuckets['5'].count
			),
			'averageTime__Dev_5+': divideAndRound(
				cycleTimeBuckets['5+'].dev,
				cycleTimeBuckets['5+'].count
			),
			'averageTime__QA_5+': divideAndRound(
				cycleTimeBuckets['5+'].qa,
				cycleTimeBuckets['5+'].count
			),
			'averageTime__UAT_5+': divideAndRound(
				cycleTimeBuckets['5+'].uat,
				cycleTimeBuckets['5+'].count
			),
			totalStoryIssues: storyPoints,
			totalStoryIssuesNotCompleted: notCompletedStoryPoints,
			totalBugsIssues: bugs,
			carryOverNumber: carry_over,
			carryOverPercentage: Math.round((carry_over / finalNum) * 100),
			sprintCommitedPoints: totalPoints,
			sprintCompletedPoints: totalPoints - notCompletedPoints,
			sprintnotCompletedPoints: notCompletedPoints,
			sprintnotCompletedPointsPercentage: Math.round(
				(notCompletedPoints / totalPoints) * 100
			),
			totalTestCases,
			avgTestCasesPerPbi: parseFloat(
				(totalTestCases / finalNum).toFixed(2)
			),
			pbiWithTestCases:
				((finalNum - pbiWithoutTestCases) / finalNum) * 100,
		};

		let avgDevTimeByEachDev = averageTimeCal(developers, true);
		let avgQaTimeByEachQa = averageTimeCal(qaEng, false);

		await createCSV(
			data,
			finalData,
			avgDevTimeByEachDev,
			avgQaTimeByEachQa
		);
	} catch (error) {
		console.error('Error in writing the data: ', error);
		throw error;
	}
};

const averageTimeCal = (data, signal) => {
	const avgTimeSpent = {};
	Object.keys(data).forEach(name => {
		const person = data[name];
		const totalTime = person.totalTime;
		const number = person.number;
		if (signal) {
			let object = { avgTime: 0, qaKB: 0, uatKB: 0 };
			object.avgTime = parseFloat((totalTime / number).toFixed(3));
			if (!object.avgTime) {
				object.avgTime = 0;
			}
			object.qaKB = person.qaKB;
			object.uatKB = person.uatKB;
			avgTimeSpent[name] = object;
		} else {
			let object = { avgTime: 0, qaKB: 0, uatKB: 0 };
			object.avgTime = parseFloat((totalTime / number).toFixed(3));
			if (!object.avgTime) {
				object.avgTime = 0;
			}
			object.qaKB = person.qaKB;
			avgTimeSpent[name] = object;
		}
	});
	return avgTimeSpent;
};

const getBucket = point => {
	if (point === 1 || point === 2) return '1-2';
	if (point === 3) return '3';
	if (point === 5) return '5';
	if (point > 5) return '5+';
	return null;
};

const divideAndRound = (numerator, denominator) => {
	if (denominator === 0) return 0;
	return Math.round((numerator / denominator) * 1000) / 1000;
};

module.exports = { mainFunc };
