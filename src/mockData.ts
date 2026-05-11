import { Segment, RampSegment } from './types';

export const initialRampSegments: RampSegment[] = [
  {
    id: 'r1',
    rampId: 'R-01-A',
    rampName: '南投服務區南出',
    rampNo: '匝道一',
    laneCount: 2,
    length: 1240,
    status: 'Optimal',
    highway: '國道3號',
    interchange: '中興系統',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '111',
    constructionMonth: '08',
    completionTime: '111/08',
    startMileage: 0,
    endMileage: 1240,
    direction: 'Southbound',
    lanes: ['第一車道'],
    pavementLayers: [
      { id: 'rl1', type: 'PAC (多孔隙瀝青混凝土)', thickness: 2, month: '11108' },
      { id: 'rl2', type: 'DGAC (密級配瀝青混凝土)', thickness: 22, month: '10905' }
    ],
    maintenanceHistory: [
      { id: 'm1', year: '111', startMileage: 0, endMileage: 310, type: 'OG', color: '#fbbf24', label: '2cm OGAC' },
      { id: 'm1_2', year: '113', startMileage: 0, endMileage: 310, type: 'OG', color: '#fbbf24', label: '2cm OGAC' },
      { id: 'm2', year: '109', startMileage: 310, endMileage: 620, type: 'OG_DG', color: '#f97316', label: '22cm OG+DG' },
      { id: 'm2_2', year: '110', startMileage: 310, endMileage: 620, type: 'OG_DG', color: '#f97316', label: '22cm OG+DG' },
      { id: 'm3', year: '107', startMileage: 620, endMileage: 930, type: 'MILLING', color: '#3b82f6', label: '2cm OGAC' },
      { id: 'm4', year: '104', startMileage: 930, endMileage: 1240, type: 'REINFORCEMENT', color: '#64748b', label: '22cm OG+DG' },
      { id: 'm4_2', year: '105', startMileage: 930, endMileage: 1240, type: 'REINFORCEMENT', color: '#64748b', label: '22cm OG+DG' }
    ],
    prevConstructionYear: '107',
    prevConstructionDepth: 12
  },
  {
    id: 'r2',
    rampId: 'R-01-B',
    rampName: '南投服務區南入',
    rampNo: '匝道二',
    laneCount: 1,
    length: 890,
    status: 'Warning',
    highway: '國道3號',
    interchange: '中興系統',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '108',
    constructionMonth: '11',
    completionTime: '108/11',
    startMileage: 0,
    endMileage: 890,
    direction: 'Southbound',
    lanes: ['第一車道'],
    pavementLayers: [
      { id: 'rl3', type: 'DGAC (密級配瀝青混凝土)', thickness: 10, month: '10811' }
    ],
    maintenanceHistory: [
      { id: 'm5', year: '108', startMileage: 0, endMileage: 445, type: 'OG_DG', color: '#f97316', label: '22cm OG+DG' },
      { id: 'm6', year: '105', startMileage: 445, endMileage: 890, type: 'REINFORCEMENT', color: '#64748b', label: '22cm OG+DG' }
    ],
    prevConstructionYear: '105',
    prevConstructionDepth: 15
  },
  {
    id: 'r3',
    rampId: 'R-02-C',
    rampName: '南投服務區北出',
    rampNo: '匝道三',
    laneCount: 2,
    length: 1560,
    status: 'Inspection',
    highway: '國道3號',
    interchange: '中興系統',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '112',
    constructionMonth: '03',
    completionTime: '112/03',
    startMileage: 0,
    endMileage: 1560,
    direction: 'Northbound',
    lanes: ['第一車道', '第二車道'],
    pavementLayers: [
      { id: 'rl4', type: 'DGAC (密級配瀝青混凝土)', thickness: 15, month: '10503' }
    ],
    maintenanceHistory: [
      { id: 'm7', year: '112', startMileage: 0, endMileage: 250, type: 'OG', color: '#fbbf24', label: '2cm OGAC' },
      { id: 'm8', year: '109', startMileage: 250, endMileage: 1000, type: 'MILLING', color: '#3b82f6', label: '22cm OG+DG' },
      { id: 'm8_2', year: '110', startMileage: 250, endMileage: 1000, type: 'MILLING', color: '#3b82f6', label: '22cm OG+DG' },
      { id: 'm9', year: '108', startMileage: 1000, endMileage: 1560, type: 'OG_DG', color: '#f97316', label: '22cm OG+DG' }
    ],
    prevConstructionYear: '100',
    prevConstructionDepth: 10
  },
  {
    id: 'r4',
    rampId: 'R-03-E',
    rampName: '南投服務區北入',
    rampNo: '匝道四',
    laneCount: 1,
    length: 720,
    status: 'Optimal',
    highway: '國道3號',
    interchange: '中興系統',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '110',
    constructionMonth: '12',
    startMileage: 0,
    endMileage: 720,
    direction: 'Southbound',
    lanes: ['第一車道'],
    pavementLayers: [
      { id: 'rl5', type: 'PAC (多孔隙瀝青混凝土)', thickness: 5, month: '11212' }
    ],
    maintenanceHistory: [
      { id: 'm10', year: '110', startMileage: 0, endMileage: 360, type: 'MILLING', color: '#3b82f6', label: '22cm OG+DG' },
      { id: 'm11', year: '108', startMileage: 360, endMileage: 720, type: 'OG', color: '#fbbf24', label: '2cm OGAC' }
    ],
    prevConstructionYear: '108',
  }
];

export const initialSegments: Segment[] = [
  {
    id: '1',
    highway: '國道1號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '113',
    constructionMonth: '05',
    startMileage: 166427,
    endMileage: 166527,
    direction: 'Southbound',
    lanes: ['第四車道'],
    pavementLayers: [
      { id: 'l1', type: 'OGAC (開級配瀝青混凝土)', thickness: 2, month: '11305' },
      { id: 'l2', type: 'DGAC (密級配瀝青混凝土)', thickness: 12, month: '10405' }
    ],
    notes: '路面狀況良好',
    prevConstructionYear: '104',
    prevConstructionDepth: 12
  },
  {
    id: '2',
    highway: '國道1號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '113',
    constructionMonth: '06',
    startMileage: 166527,
    endMileage: 166627,
    direction: 'Southbound',
    lanes: ['第四車道'],
    pavementLayers: [
      { id: 'l1', type: 'OGAC (開級配瀝青混凝土)', thickness: 2, month: '11306' },
      { id: 'l2', type: 'DGAC (密級配瀝青混凝土)', thickness: 12, month: '10405' }
    ],
    notes: '',
    prevConstructionYear: '104',
    prevConstructionDepth: 12
  },
  {
    id: '3',
    highway: '國道1號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '113',
    constructionMonth: '07',
    startMileage: 166507,
    endMileage: 166907,
    direction: 'Southbound',
    lanes: ['第二車道'],
    pavementLayers: [
      { id: 'l1', type: 'OGAC (開級配瀝青混凝土)', thickness: 2, month: '11307' },
      { id: 'l2', type: 'DGAC (密級配瀝青混凝土)', thickness: 12, month: '10405' }
    ],
    notes: '',
    prevConstructionYear: '104',
    prevConstructionDepth: 12
  },
  {
    id: '4',
    highway: '國道1號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '111',
    constructionMonth: '08',
    startMileage: 166827,
    endMileage: 167227,
    direction: 'Northbound',
    lanes: ['第三車道'],
    pavementLayers: [
      { id: 'l1', type: '其他/舊有', thickness: 0, month: '11108' }
    ],
    notes: '舊有路面',
    prevConstructionYear: '',
    prevConstructionDepth: 0
  },
  {
    id: '5',
    highway: '國道3號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '112',
    constructionMonth: '03',
    startMileage: 183587,
    endMileage: 183887,
    direction: 'Southbound',
    lanes: ['第一車道'],
    pavementLayers: [
      { id: 'l1', type: 'PAC (多孔隙瀝青混凝土)', thickness: 3, month: '11203' },
      { id: 'l2', type: 'DGAC (密級配瀝青混凝土)', thickness: 10, month: '10502' }
    ],
    notes: '',
    prevConstructionYear: '105',
    prevConstructionDepth: 10
  },
  {
    id: '6',
    highway: '國道4號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '110',
    constructionMonth: '11',
    startMileage: 10982,
    endMileage: 11582,
    direction: 'Northbound',
    lanes: ['第二車道'],
    pavementLayers: [
      { id: 'l1', type: '其他/舊有', thickness: 22, month: '11011' }
    ],
    notes: '',
    prevConstructionYear: '',
    prevConstructionDepth: 0
  }
];

export const initialPlanningSegments: Segment[] = [];
