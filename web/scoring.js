(function (root) {
  'use strict';
  const round4 = n => Math.round(n * 1e4) / 1e4;
  function calculate(p, answers) {
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw Error('答案格式无效');
    const expected = p.questions.map(q => q.id);
    if (Object.keys(answers).length !== expected.length || expected.some(id => !Object.hasOwn(answers, id))) throw Error('请先完成全部题目');
    const sums = {}, capacities = {}, evidence = [];
    p.dimensions.forEach(d => { sums[d.id] = 0; capacities[d.id] = 0; });
    p.questions.forEach(q => {
      const c = q.choices.find(c => c.id === answers[q.id]);
      if (!c) throw Error('答案选项无效');
      p.dimensions.forEach(d => {
        sums[d.id] += c.effects[d.id] || 0;
        capacities[d.id] += Math.max(...q.choices.map(x => Math.abs(x.effects[d.id] || 0)));
      });
      evidence.push({ questionId: q.id, text: c.evidence, effects: c.effects });
    });
    const dimensions = {};
    p.dimensions.forEach(d => {
      if (!capacities[d.id]) throw Error('存在未测量维度');
      dimensions[d.id] = Math.max(0, Math.min(100, Math.round(50 + 50 * sums[d.id] / capacities[d.id])));
    });
    const totalWeight = p.dimensions.reduce((n, d) => n + d.weight, 0);
    const ranking = p.profiles.map(profile => ({ id: profile.id, name: profile.name,
      distance: round4(Math.sqrt(p.dimensions.reduce((n, d) => n + d.weight * (dimensions[d.id] - profile.vector[d.id]) ** 2, 0) / totalWeight))
    })).sort((a, b) => a.distance - b.distance || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return { dimensions, ranking, evidence, ambiguous: ranking[1].distance - ranking[0].distance <= p.scoring.tieThreshold };
  }
  function describe(d, value) {
    return value >= 60 ? d.highCopy : value <= 40 ? d.lowCopy : `在「${d.lowLabel}」与「${d.highLabel}」之间，你会随情境调整。`;
  }
  function report(p, r) {
    const profile = p.profiles.find(x => x.id === r.ranking[0].id);
    const salient = [...p.dimensions].sort((a, b) => Math.abs(r.dimensions[b.id] - 50) - Math.abs(r.dimensions[a.id] - 50));
    const evidence = salient.slice(0, 3).map(d => [...r.evidence].filter(e => Object.hasOwn(e.effects, d.id))
      .sort((a, b) => { const direction = Math.sign(r.dimensions[d.id] - 50); return (direction ? direction * (b.effects[d.id] - a.effects[d.id]) : Math.abs(b.effects[d.id]) - Math.abs(a.effects[d.id])) || a.questionId.localeCompare(b.questionId); })[0]);
    const gaps = [...p.dimensions].sort((a, b) => Math.abs(r.dimensions[a.id] - profile.vector[a.id]) - Math.abs(r.dimensions[b.id] - profile.vector[b.id]));
    const difference = gaps[gaps.length - 1];
    const s = r.dimensions;
    let insight;
    if (s.action >= 60 && s.structure >= 60) insight = '你既愿意开始，也愿意为行动安排步骤。可以给一个新想法设定最小的第一步，再留一个检查节点。';
    else if (s.care >= 60 && s.loyalty >= 60) insight = '你的回答同时偏向照顾感受和珍惜熟悉的关系。下次提供支持前，可以先问对方需要倾听还是实际帮助，也确认自己有多少余力。';
    else if (s.analysis >= 60 && s.freedom >= 60) insight = '你既愿意查证，也愿意尝试自己的路径。可以把一个新点子变成小实验，提前约定什么结果会让你保留或调整它。';
    else if (s.ambition >= 60 && s.loyalty <= 40) insight = '你同时看重成果与统一标准。合作前把目标和分配方式说清楚，可能更符合你在这些题目中的偏好。';
    else if (s.expression <= 40 && s.care >= 60) insight = '你倾向安静表达，也会照顾感受。一次私下的问候或一封清楚的小留言，可能比在很多人面前发言更适合你的支持方式。';
    else if (s.action >= 60 && s.structure <= 40) insight = '你偏好先行动、再根据现场调整。新尝试前列出一个必须确认的条件，就能让弹性多一份支点。';
    else if (s.freedom >= 60 && s.ambition <= 40) insight = '你给自主探索和过程体验都留了位置。可以为一项没有成绩要求的兴趣留半小时，观察它是否真的让你享受。';
    else if (s.analysis >= 60 && s.structure >= 60) insight = '你偏好查清线索与事先安排。可以为资料整理设一个停止条件，等信息足够时开始一次实际尝试。';
    else insight = `这次回答最明显的侧面是「${salient[0].name}」。${describe(salient[0], s[salient[0].id])} 回想最近一次类似的真实选择，看看这是否只是当下情境，还是常见习惯。`;
    return { profile, salient, evidence, similar: gaps.slice(0, 2), difference, insight,
      weakMatch: r.ranking[0].distance >= p.scoring.weakMatchThreshold,
      lowSeparation: r.ranking[2].distance - r.ranking[0].distance <= p.scoring.lowSeparationThreshold };
  }
  root.AssessmentScoring = { calculate, report, describe };
  if (typeof module !== 'undefined') module.exports = root.AssessmentScoring;
})(typeof window === 'undefined' ? globalThis : window);
