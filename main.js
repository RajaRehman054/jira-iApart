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
		let averageTime = { devCycleTime: 0, qaCycleTime: 0, uatCycleTime: 0 };
		let carry_over = 0;
		let total_qaKickBacks = 0;
		let total_uatKickBacks = 0;
		let totalPoints = 0;
		let notCompletedPoints = 0;
		let storyPoints = 0;
		let bugs = 0;

		for (let index = 0; index < data.length; index++) {
			if (data[index].lastState === 'Obsolete') {
				continue;
			}
			let dev = data[index]['Developer'];
			let qa = data[index]['QA Engineer'];

			if (data[index].issue_type === 'Story') {
				storyPoints += 1;
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
			}
		}

		averageTime.devCycleTime = parseFloat(
			(averageTime.devCycleTime / (data.length - carry_over)).toFixed(3)
		);
		averageTime.qaCycleTime = parseFloat(
			(averageTime.qaCycleTime / (data.length - carry_over)).toFixed(3)
		);
		averageTime.uatCycleTime = parseFloat(
			(averageTime.uatCycleTime / (data.length - carry_over)).toFixed(3)
		);

		let finalData = {
			...averageTime,
			totalStoryIssues: storyPoints,
			totalBugsIssues: bugs,
			carryOverNumber: carry_over,
			carryOverPercentage: Math.round((carry_over / data.length) * 100),
			sprintCommitedPoints: totalPoints,
			sprintCompletedPoints: totalPoints - notCompletedPoints,
			sprintnotCompletedPoints: notCompletedPoints,
			sprintnotCompletedPointsPercentage: Math.round(
				(notCompletedPoints / totalPoints) * 100
			),
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

module.exports = { mainFunc };
