const PERSONAS = [
  { id: "P01", name: "人生排位赛选手", mother_type: "M1" },
  { id: "P12", name: "低调战略家", mother_type: "M1" },
  { id: "P25", name: "老干部", mother_type: "M1" },
  { id: "P06", name: "混乱过敏体", mother_type: "M1" },
  { id: "P31", name: "留一手", mother_type: "M1" },

  { id: "P35", name: "情感满仓者", mother_type: "M2" },
  { id: "P14", name: "恒温热源", mother_type: "M2" },
  { id: "P27", name: "本色出演", mother_type: "M2" },
  { id: "P30", name: "温柔排版师", mother_type: "M2" },

  { id: "P02", name: "情绪预警机", mother_type: "M3" },
  { id: "P22", name: "情绪共振体", mother_type: "M3" },
  { id: "P20", name: "深夜复盘脑", mother_type: "M3" },
  { id: "P28", name: "感知偏科生", mother_type: "M3" },

  { id: "P09", name: "关系分层大师", mother_type: "M4" },
  { id: "P34", name: "社交小饭桌", mother_type: "M4" },
  { id: "P33", name: "自我闭环怪", mother_type: "M4" },
  { id: "P15", name: "情绪自理人", mother_type: "M4" },
  { id: "P17", name: "关系试用期", mother_type: "M4" },

  { id: "P05", name: "藏进度条型", mother_type: "M5" },
  { id: "P03", name: "人生不代驾", mother_type: "M5" },
  { id: "P36", name: "自带推进器", mother_type: "M5" },
  { id: "P07", name: "压力通电体", mother_type: "M5" },

  { id: "P13", name: "慢牛型选手", mother_type: "M6" },
  { id: "P26", name: "深根型选手", mother_type: "M6" },
  { id: "P16", name: "PPT过敏体", mother_type: "M6" },
  { id: "P19", name: "低调高光型", mother_type: "M6" },

  { id: "P10", name: "先觉者", mother_type: "M7" },
  { id: "P29", name: "多线程玩家", mother_type: "M7" },
  { id: "P18", name: "情绪缝合怪", mother_type: "M7" },
  { id: "P04", name: "已读观望型", mother_type: "M7" },

  { id: "P11", name: "双面行者", mother_type: "M8" },
  { id: "P21", name: "反差克制系", mother_type: "M8" },
  { id: "P08", name: "软钉子", mother_type: "M8" },
  { id: "P32", name: "大招捏手党", mother_type: "M8" },
  { id: "P23", name: "身份自定义", mother_type: "M8" },
  { id: "P24", name: "节奏掌控者", mother_type: "M8" },
];

const MOTHER_TO_PERSONAS = PERSONAS.reduce((mapping, persona) => {
  if (!mapping[persona.mother_type]) {
    mapping[persona.mother_type] = [];
  }
  mapping[persona.mother_type].push(persona);
  return mapping;
}, {});

const PERSONA_BY_ID = PERSONAS.reduce((mapping, persona) => {
  mapping[persona.id] = persona;
  return mapping;
}, {});

const PERSONA_TO_MOTHER = PERSONAS.reduce((mapping, persona) => {
  mapping[persona.id] = persona.mother_type;
  return mapping;
}, {});

module.exports = {
  MOTHER_TO_PERSONAS,
  PERSONAS,
  PERSONA_BY_ID,
  PERSONA_TO_MOTHER,
};
