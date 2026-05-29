// CBA 2024-2025赛季 全部20支球队球员数据
// 能力值：投篮(shooting) 速度(speed) 力量(strength) 防守(defense) 控球(dribbling) 弹跳(jumping)
// 范围 1-99

const CBA_TEAMS = [
  {
    id: 'liaoning',
    name: '辽宁本钢',
    abbr: '辽宁',
    color: '#c8102e',
    players: [
      { id: 'zhaojiwei', name: '赵继伟', num: 3, pos: 'PG', shooting: 82, speed: 85, strength: 65, defense: 78, dribbling: 92, jumping: 68 },
      { id: 'guoailun', name: '郭艾伦', num: 13, pos: 'SG', shooting: 78, speed: 92, strength: 72, defense: 75, dribbling: 95, jumping: 75 },
      { id: 'zhangzhenlin', name: '张镇麟', num: 77, pos: 'SF', shooting: 80, speed: 88, strength: 80, defense: 82, dribbling: 78, jumping: 90 },
      { id: 'fugao', name: '付豪', num: 1, pos: 'PF', shooting: 76, speed: 72, strength: 85, defense: 70, dribbling: 68, jumping: 72 },
      { id: 'hanjun', name: '韩德君', num: 55, pos: 'C', shooting: 65, speed: 50, strength: 95, defense: 78, dribbling: 45, jumping: 45 },
      { id: 'lixiaoxu', name: '李晓旭', num: 22, pos: 'PF', shooting: 70, speed: 65, strength: 88, defense: 82, dribbling: 60, jumping: 62 },
      { id: 'congmingchen', name: '丛明晨', num: 10, pos: 'SF', shooting: 78, speed: 76, strength: 68, defense: 70, dribbling: 72, jumping: 74 },
      { id: 'yanzhongqi', name: '鄢手骐', num: 36, pos: 'PG', shooting: 68, speed: 80, strength: 62, defense: 72, dribbling: 78, jumping: 70 },
      { id: 'morland', name: '莫兰德', num: 25, pos: 'C', shooting: 55, speed: 65, strength: 92, defense: 90, dribbling: 50, jumping: 78 },
      { id: 'fogg', name: '弗格', num: 4, pos: 'SG', shooting: 90, speed: 86, strength: 75, defense: 82, dribbling: 88, jumping: 76 },
      { id: 'liuhuyi', name: '刘雁宇', num: 17, pos: 'C', shooting: 60, speed: 62, strength: 80, defense: 68, dribbling: 48, jumping: 70 },
      { id: 'yushuchen', name: '俞泽辰', num: 27, pos: 'SF', shooting: 72, speed: 74, strength: 70, defense: 65, dribbling: 68, jumping: 76 },
    ]
  },
  {
    id: 'guangdong',
    name: '广东东阳光',
    abbr: '广东',
    color: '#003399',
    players: [
      { id: 'yijianlian', name: '易建联', num: 9, pos: 'C', shooting: 85, speed: 72, strength: 90, defense: 88, dribbling: 62, jumping: 88 },
      { id: 'humingxuan', name: '胡明轩', num: 3, pos: 'SG', shooting: 84, speed: 86, strength: 72, defense: 80, dribbling: 85, jumping: 78 },
      { id: 'xujie', name: '徐杰', num: 2, pos: 'PG', shooting: 82, speed: 84, strength: 58, defense: 74, dribbling: 90, jumping: 66 },
      { id: 'zhourui', name: '周琦', num: 26, pos: 'C', shooting: 72, speed: 70, strength: 88, defense: 92, dribbling: 55, jumping: 85 },
      { id: 'renjunfei', name: '任骏飞', num: 20, pos: 'PF', shooting: 74, speed: 68, strength: 82, defense: 78, dribbling: 65, jumping: 68 },
      { id: 'duzhunwang', name: '杜润旺', num: 18, pos: 'PF', shooting: 80, speed: 66, strength: 78, defense: 65, dribbling: 62, jumping: 64 },
      { id: 'zhanghaoji', name: '张皓嘉', num: 25, pos: 'SF', shooting: 72, speed: 72, strength: 74, defense: 68, dribbling: 70, jumping: 72 },
      { id: 'waters', name: '沃特斯', num: 1, pos: 'PG', shooting: 85, speed: 94, strength: 62, defense: 72, dribbling: 95, jumping: 80 },
      { id: 'weems', name: '威姆斯', num: 13, pos: 'SF', shooting: 78, speed: 82, strength: 80, defense: 75, dribbling: 82, jumping: 82 },
      { id: 'zhangwenji', name: '张文逸', num: 14, pos: 'SG', shooting: 74, speed: 76, strength: 65, defense: 66, dribbling: 74, jumping: 72 },
      { id: 'huangmingyi', name: '黄明依', num: 6, pos: 'SF', shooting: 66, speed: 78, strength: 70, defense: 68, dribbling: 66, jumping: 78 },
      { id: 'zhangmingchi', name: '张明池', num: 27, pos: 'C', shooting: 58, speed: 58, strength: 84, defense: 70, dribbling: 42, jumping: 60 },
      { id: 'xuxin', name: '徐昕', num: 19, pos: 'C', shooting: 56, speed: 55, strength: 82, defense: 72, dribbling: 40, jumping: 65 },
    ]
  },
  {
    id: 'xinjiang',
    name: '新疆伊力特',
    abbr: '新疆',
    color: '#0055a5',
    players: [
      { id: 'abdusalam', name: '阿不都沙拉木', num: 23, pos: 'PF', shooting: 82, speed: 76, strength: 84, defense: 80, dribbling: 72, jumping: 76 },
      { id: 'qilin', name: '齐麟', num: 11, pos: 'SF', shooting: 84, speed: 82, strength: 74, defense: 72, dribbling: 76, jumping: 85 },
      { id: 'zhaorui', name: '赵睿', num: 8, pos: 'SG', shooting: 78, speed: 86, strength: 80, defense: 82, dribbling: 86, jumping: 78 },
      { id: 'yudchangdong', name: '于德豪', num: 6, pos: 'PG', shooting: 65, speed: 82, strength: 68, defense: 84, dribbling: 78, jumping: 68 },
      { id: 'luttbulah', name: '鲁吐布拉', num: 14, pos: 'C', shooting: 58, speed: 60, strength: 88, defense: 75, dribbling: 42, jumping: 72 },
      { id: 'zhuan', name: '朱旭航', num: 22, pos: 'PF', shooting: 76, speed: 70, strength: 80, defense: 74, dribbling: 65, jumping: 74 },
      { id: 'tangcaiyu', name: '唐才育', num: 5, pos: 'SF', shooting: 74, speed: 74, strength: 68, defense: 68, dribbling: 70, jumping: 72 },
      { id: 'huangrongqi', name: '黄荣奇', num: 4, pos: 'PG', shooting: 68, speed: 84, strength: 66, defense: 70, dribbling: 80, jumping: 76 },
      { id: 'jones', name: '多米尼克·琼斯', num: 55, pos: 'SG', shooting: 80, speed: 88, strength: 85, defense: 78, dribbling: 90, jumping: 82 },
      { id: 'wuguanxi', name: '吴冠希', num: 9, pos: 'C', shooting: 62, speed: 62, strength: 86, defense: 80, dribbling: 48, jumping: 70 },
      { id: 'xirreli', name: '西热力江', num: 7, pos: 'SG', shooting: 76, speed: 72, strength: 74, defense: 76, dribbling: 74, jumping: 66 },
      { id: 'liyiyang', name: '李炎哲', num: 13, pos: 'C', shooting: 56, speed: 52, strength: 92, defense: 78, dribbling: 38, jumping: 55 },
    ]
  },
  {
    id: 'zhejiang_chouzhou',
    name: '浙江稠州金租',
    abbr: '浙江',
    color: '#b22222',
    players: [
      { id: 'wuqiang', name: '吴前', num: 33, pos: 'SG', shooting: 92, speed: 84, strength: 68, defense: 72, dribbling: 85, jumping: 70 },
      { id: 'chengpeng', name: '程帅澎', num: 6, pos: 'SG', shooting: 80, speed: 82, strength: 72, defense: 78, dribbling: 80, jumping: 76 },
      { id: 'liuyize', name: '刘泽一', num: 10, pos: 'PF', shooting: 72, speed: 74, strength: 82, defense: 76, dribbling: 66, jumping: 74 },
      { id: 'wangyibo', name: '王奕博', num: 15, pos: 'PG', shooting: 70, speed: 86, strength: 62, defense: 74, dribbling: 84, jumping: 70 },
      { id: 'yujiahao', name: '余嘉豪', num: 11, pos: 'C', shooting: 68, speed: 55, strength: 90, defense: 82, dribbling: 42, jumping: 62 },
      { id: 'luzhouwenbo', name: '陆文博', num: 8, pos: 'SF', shooting: 76, speed: 78, strength: 70, defense: 76, dribbling: 70, jumping: 78 },
      { id: 'gaily', name: '盖利', num: 3, pos: 'SF', shooting: 78, speed: 86, strength: 78, defense: 82, dribbling: 80, jumping: 84 },
      { id: 'perry', name: '佩里', num: 0, pos: 'PF', shooting: 74, speed: 72, strength: 86, defense: 72, dribbling: 65, jumping: 76 },
      { id: 'linxiaotian', name: '林孝天', num: 5, pos: 'PG', shooting: 66, speed: 82, strength: 60, defense: 68, dribbling: 78, jumping: 72 },
      { id: 'wangzilu', name: '王子路', num: 12, pos: 'PF', shooting: 68, speed: 70, strength: 78, defense: 72, dribbling: 62, jumping: 70 },
    ]
  },
  {
    id: 'guangsha',
    name: '浙江广厦雄狮',
    abbr: '广厦',
    color: '#f5a623',
    players: [
      { id: 'sunminghui', name: '孙铭徽', num: 17, pos: 'PG', shooting: 80, speed: 90, strength: 74, defense: 82, dribbling: 92, jumping: 80 },
      { id: 'huzhinqiu', name: '胡金秋', num: 21, pos: 'PF', shooting: 86, speed: 74, strength: 84, defense: 80, dribbling: 68, jumping: 76 },
      { id: 'zhaoyanhao', name: '赵岩昊', num: 25, pos: 'SG', shooting: 82, speed: 84, strength: 65, defense: 72, dribbling: 80, jumping: 74 },
      { id: 'zhujunlong', name: '朱俊龙', num: 10, pos: 'SF', shooting: 74, speed: 78, strength: 76, defense: 82, dribbling: 72, jumping: 80 },
      { id: 'xuzhonghao', name: '许钟豪', num: 24, pos: 'C', shooting: 60, speed: 50, strength: 90, defense: 78, dribbling: 40, jumping: 52 },
      { id: 'okafo', name: '奥卡福', num: 15, pos: 'C', shooting: 72, speed: 65, strength: 88, defense: 82, dribbling: 52, jumping: 74 },
      { id: 'weizhe', name: '威哲', num: 2, pos: 'PG', shooting: 74, speed: 82, strength: 66, defense: 70, dribbling: 86, jumping: 72 },
      { id: 'lijinglong', name: '李金效', num: 13, pos: 'SF', shooting: 70, speed: 70, strength: 72, defense: 68, dribbling: 66, jumping: 68 },
      { id: 'wuxiao', name: '吴骁', num: 5, pos: 'PF', shooting: 62, speed: 68, strength: 82, defense: 72, dribbling: 55, jumping: 68 },
      { id: 'duanliqian', name: '段立谦', num: 3, pos: 'PG', shooting: 64, speed: 80, strength: 58, defense: 65, dribbling: 76, jumping: 68 },
    ]
  },
  {
    id: 'shanghai',
    name: '上海久事',
    abbr: '上海',
    color: '#1e40af',
    players: [
      { id: 'wangzhelin', name: '王哲林', num: 94, pos: 'C', shooting: 76, speed: 62, strength: 88, defense: 78, dribbling: 52, jumping: 65 },
      { id: 'liutricen', name: '刘铮', num: 5, pos: 'SG', shooting: 78, speed: 80, strength: 68, defense: 84, dribbling: 78, jumping: 72 },
      { id: 'luohandichen', name: '罗汉琛', num: 33, pos: 'PG', shooting: 72, speed: 84, strength: 62, defense: 70, dribbling: 82, jumping: 66 },
      { id: 'renjewei', name: '任骏威', num: 9, pos: 'PF', shooting: 74, speed: 68, strength: 80, defense: 74, dribbling: 64, jumping: 64 },
      { id: 'guohaowen', name: '郭昊文', num: 7, pos: 'SG', shooting: 72, speed: 88, strength: 74, defense: 66, dribbling: 82, jumping: 84 },
      { id: 'lihongquan', name: '李弘权', num: 14, pos: 'SF', shooting: 74, speed: 76, strength: 78, defense: 72, dribbling: 70, jumping: 78 },
      { id: 'bledsoe', name: '布莱德索', num: 2, pos: 'PG', shooting: 78, speed: 90, strength: 82, defense: 80, dribbling: 92, jumping: 82 },
      { id: 'franklin', name: '富兰克林', num: 1, pos: 'SG', shooting: 82, speed: 84, strength: 78, defense: 74, dribbling: 86, jumping: 78 },
      { id: 'lipeng', name: '李鹏', num: 23, pos: 'PF', shooting: 66, speed: 68, strength: 78, defense: 68, dribbling: 60, jumping: 66 },
      { id: 'yanpengfei', name: '闫鹏飞', num: 10, pos: 'C', shooting: 64, speed: 58, strength: 84, defense: 72, dribbling: 45, jumping: 58 },
    ]
  },
  {
    id: 'beijing_shougang',
    name: '北京北汽',
    abbr: '北京',
    color: '#0066cc',
    players: [
      { id: 'zengfanbo', name: '曾凡博', num: 1, pos: 'SF', shooting: 82, speed: 84, strength: 72, defense: 78, dribbling: 74, jumping: 90 },
      { id: 'fangshou', name: '方硕', num: 8, pos: 'SG', shooting: 80, speed: 78, strength: 70, defense: 72, dribbling: 82, jumping: 68 },
      { id: 'zhairan', name: '翟晓川', num: 20, pos: 'PF', shooting: 76, speed: 74, strength: 82, defense: 80, dribbling: 68, jumping: 76 },
      { id: 'fanzi', name: '范子铭', num: 17, pos: 'C', shooting: 68, speed: 62, strength: 86, defense: 76, dribbling: 48, jumping: 62 },
      { id: 'tianyouxiang', name: '田宇翔', num: 25, pos: 'PG', shooting: 68, speed: 82, strength: 64, defense: 74, dribbling: 80, jumping: 68 },
      { id: 'leaf', name: '利夫', num: 2, pos: 'PF', shooting: 72, speed: 74, strength: 82, defense: 78, dribbling: 66, jumping: 80 },
      { id: 'zhangcairren', name: '张才仁', num: 16, pos: 'SG', shooting: 72, speed: 74, strength: 68, defense: 68, dribbling: 72, jumping: 70 },
      { id: 'leimeng', name: '雷蒙', num: 9, pos: 'SF', shooting: 74, speed: 72, strength: 76, defense: 72, dribbling: 68, jumping: 68 },
      { id: 'qiulin', name: '邱天', num: 19, pos: 'C', shooting: 56, speed: 58, strength: 90, defense: 74, dribbling: 40, jumping: 62 },
      { id: 'johnson', name: '尼克·约翰逊', num: 0, pos: 'PG', shooting: 76, speed: 88, strength: 74, defense: 76, dribbling: 88, jumping: 80 },
    ]
  },
  {
    id: 'beijing_ent',
    name: '北京控股',
    abbr: '北控',
    color: '#8b0000',
    players: [
      { id: 'zhangfan', name: '张帆', num: 6, pos: 'SG', shooting: 84, speed: 80, strength: 70, defense: 72, dribbling: 78, jumping: 70 },
      { id: 'zozotonglin', name: '邹雨宸', num: 10, pos: 'C', shooting: 68, speed: 62, strength: 88, defense: 80, dribbling: 48, jumping: 72 },
      { id: 'liuleather', name: '廖三宁', num: 2, pos: 'PG', shooting: 72, speed: 86, strength: 66, defense: 70, dribbling: 88, jumping: 76 },
      { id: 'yuchangdong2', name: '俞长栋', num: 7, pos: 'PF', shooting: 72, speed: 68, strength: 82, defense: 76, dribbling: 62, jumping: 66 },
      { id: 'wangshaojie', name: '王少杰', num: 14, pos: 'PF', shooting: 70, speed: 74, strength: 78, defense: 74, dribbling: 64, jumping: 78 },
      { id: 'mengzokai', name: '孟子凯', num: 1, pos: 'SF', shooting: 74, speed: 74, strength: 72, defense: 68, dribbling: 70, jumping: 74 },
      { id: 'lining', name: '李宁', num: 3, pos: 'PG', shooting: 66, speed: 82, strength: 60, defense: 68, dribbling: 80, jumping: 68 },
      { id: 'shenjie', name: '沈梓捷', num: 11, pos: 'C', shooting: 64, speed: 68, strength: 86, defense: 82, dribbling: 48, jumping: 80 },
      { id: 'field', name: '费尔德', num: 5, pos: 'PG', shooting: 80, speed: 92, strength: 72, defense: 74, dribbling: 92, jumping: 82 },
      { id: 'jinxin', name: '金鑫', num: 8, pos: 'SF', shooting: 70, speed: 72, strength: 70, defense: 66, dribbling: 68, jumping: 70 },
    ]
  },
  {
    id: 'shandong',
    name: '山东高速',
    abbr: '山东',
    color: '#e60012',
    players: [
      { id: 'gaosyan', name: '高诗岩', num: 0, pos: 'PG', shooting: 72, speed: 84, strength: 68, defense: 84, dribbling: 84, jumping: 72 },
      { id: 'taohanlin', name: '陶汉林', num: 20, pos: 'C', shooting: 65, speed: 58, strength: 94, defense: 78, dribbling: 42, jumping: 60 },
      { id: 'chenpeidong', name: '陈培东', num: 44, pos: 'SG', shooting: 76, speed: 82, strength: 68, defense: 70, dribbling: 78, jumping: 74 },
      { id: 'jiachengyi', name: '贾诚', num: 23, pos: 'PF', shooting: 72, speed: 68, strength: 84, defense: 72, dribbling: 60, jumping: 68 },
      { id: 'jiaoclong', name: '焦海龙', num: 4, pos: 'PF', shooting: 70, speed: 70, strength: 80, defense: 74, dribbling: 62, jumping: 72 },
      { id: 'liuyi2', name: '刘毅', num: 7, pos: 'SF', shooting: 74, speed: 76, strength: 72, defense: 70, dribbling: 72, jumping: 74 },
      { id: 'gailiwo', name: '吉伦沃特', num: 33, pos: 'PF', shooting: 78, speed: 74, strength: 86, defense: 74, dribbling: 68, jumping: 76 },
      { id: 'hanslin', name: '哈德森', num: 14, pos: 'SG', shooting: 88, speed: 82, strength: 76, defense: 74, dribbling: 84, jumping: 74 },
      { id: 'qiaoWenjian', name: '乔文瀚', num: 10, pos: 'SG', shooting: 70, speed: 72, strength: 66, defense: 66, dribbling: 72, jumping: 68 },
      { id: 'zhanghiyu', name: '张辉', num: 5, pos: 'PG', shooting: 66, speed: 80, strength: 64, defense: 72, dribbling: 78, jumping: 68 },
    ]
  },
  {
    id: 'guangzhou',
    name: '广州龙狮',
    abbr: '广州',
    color: '#e20613',
    players: [
      { id: 'chenyingjun', name: '陈盈骏', num: 9, pos: 'PG', shooting: 78, speed: 84, strength: 70, defense: 76, dribbling: 88, jumping: 72 },
      { id: 'zhumingzhen', name: '祝铭震', num: 7, pos: 'SF', shooting: 76, speed: 78, strength: 78, defense: 78, dribbling: 72, jumping: 76 },
      { id: 'liyangzhe', name: '李炎哲', num: 13, pos: 'C', shooting: 58, speed: 54, strength: 90, defense: 76, dribbling: 40, jumping: 56 },
      { id: 'cuijinyi', name: '崔永熙', num: 8, pos: 'SG', shooting: 78, speed: 82, strength: 74, defense: 76, dribbling: 78, jumping: 84 },
      { id: 'jiabumingru', name: '贾明儒', num: 3, pos: 'PG', shooting: 70, speed: 80, strength: 62, defense: 66, dribbling: 82, jumping: 66 },
      { id: 'guoKaifa', name: '郭凯', num: 14, pos: 'PF', shooting: 68, speed: 68, strength: 82, defense: 74, dribbling: 58, jumping: 66 },
      { id: 'moore', name: '摩尔', num: 4, pos: 'SG', shooting: 84, speed: 86, strength: 72, defense: 72, dribbling: 84, jumping: 76 },
      { id: 'campbell', name: '坎普', num: 22, pos: 'PF', shooting: 70, speed: 72, strength: 84, defense: 74, dribbling: 62, jumping: 74 },
      { id: 'liujiangcheng', name: '刘金成', num: 11, pos: 'SF', shooting: 66, speed: 74, strength: 68, defense: 68, dribbling: 66, jumping: 72 },
      { id: 'wangjunbo', name: '王泉博', num: 5, pos: 'PF', shooting: 64, speed: 66, strength: 76, defense: 70, dribbling: 56, jumping: 68 },
    ]
  },
  {
    id: 'shenzhen',
    name: '深圳马可波罗',
    abbr: '深圳',
    color: '#c41230',
    players: [
      { id: 'hexi', name: '贺希宁', num: 3, pos: 'SG', shooting: 80, speed: 82, strength: 76, defense: 80, dribbling: 80, jumping: 78 },
      { id: 'shenkijie2', name: '沈梓捷', num: 11, pos: 'C', shooting: 64, speed: 68, strength: 86, defense: 84, dribbling: 48, jumping: 82 },
      { id: 'gumingyang', name: '顾全', num: 12, pos: 'SF', shooting: 82, speed: 70, strength: 78, defense: 70, dribbling: 68, jumping: 66 },
      { id: 'baijintian', name: '白昊天', num: 2, pos: 'PG', shooting: 70, speed: 82, strength: 66, defense: 72, dribbling: 82, jumping: 70 },
      { id: 'zhoupeng', name: '周鹏', num: 9, pos: 'PF', shooting: 76, speed: 68, strength: 80, defense: 85, dribbling: 66, jumping: 68 },
      { id: 'sunhuoqin', name: '孙浩钦', num: 5, pos: 'SG', shooting: 72, speed: 80, strength: 66, defense: 68, dribbling: 76, jumping: 74 },
      { id: 'salinger', name: '萨林杰', num: 0, pos: 'PF', shooting: 78, speed: 72, strength: 90, defense: 82, dribbling: 68, jumping: 74 },
      { id: 'wuzhihan', name: '武子涵', num: 6, pos: 'SF', shooting: 68, speed: 74, strength: 70, defense: 66, dribbling: 66, jumping: 72 },
      { id: 'lihongyu', name: '李宏宇', num: 1, pos: 'PG', shooting: 64, speed: 80, strength: 58, defense: 64, dribbling: 78, jumping: 68 },
      { id: 'luzhouwen', name: '卢鹏羽', num: 8, pos: 'SF', shooting: 70, speed: 72, strength: 68, defense: 68, dribbling: 68, jumping: 70 },
    ]
  },
  {
    id: 'qingdao',
    name: '青岛国信海天',
    abbr: '青岛',
    color: '#004c97',
    players: [
      { id: 'yanghanshen', name: '杨瀚森', num: 15, pos: 'C', shooting: 68, speed: 60, strength: 84, defense: 86, dribbling: 58, jumping: 66 },
      { id: 'wangrh', name: '王睿泽', num: 2, pos: 'SF', shooting: 80, speed: 78, strength: 76, defense: 74, dribbling: 74, jumping: 78 },
      { id: 'zhaojiayi2', name: '赵嘉义', num: 33, pos: 'PF', shooting: 74, speed: 72, strength: 78, defense: 72, dribbling: 66, jumping: 74 },
      { id: 'dangmuyi', name: '段昂君', num: 3, pos: 'PG', shooting: 70, speed: 84, strength: 64, defense: 68, dribbling: 82, jumping: 72 },
      { id: 'pomurray', name: '鲍威尔', num: 13, pos: 'SG', shooting: 84, speed: 86, strength: 74, defense: 74, dribbling: 84, jumping: 78 },
      { id: 'michl', name: '米切尔', num: 1, pos: 'PF', shooting: 70, speed: 74, strength: 86, defense: 78, dribbling: 62, jumping: 80 },
      { id: 'fanzhu', name: '范汇鎏', num: 6, pos: 'SG', shooting: 72, speed: 76, strength: 68, defense: 68, dribbling: 72, jumping: 70 },
      { id: 'lijiah', name: '纪卓', num: 5, pos: 'PF', shooting: 68, speed: 68, strength: 80, defense: 72, dribbling: 58, jumping: 66 },
      { id: 'yangjinmeng', name: '杨金蒙', num: 7, pos: 'PG', shooting: 66, speed: 78, strength: 62, defense: 70, dribbling: 76, jumping: 66 },
      { id: 'ouyanghang', name: '欧俊炫', num: 9, pos: 'C', shooting: 60, speed: 62, strength: 82, defense: 70, dribbling: 44, jumping: 68 },
    ]
  },
  {
    id: 'fujian',
    name: '福建浔兴',
    abbr: '福建',
    color: '#005eb8',
    players: [
      { id: 'chenlinjian', name: '陈林坚', num: 15, pos: 'SF', shooting: 88, speed: 76, strength: 72, defense: 66, dribbling: 72, jumping: 72 },
      { id: 'liyiyang2', name: '黎伊扬', num: 3, pos: 'PG', shooting: 68, speed: 86, strength: 60, defense: 72, dribbling: 88, jumping: 68 },
      { id: 'zhuangzhan', name: '黄毅超', num: 6, pos: 'SG', shooting: 74, speed: 80, strength: 68, defense: 68, dribbling: 74, jumping: 74 },
      { id: 'wanghuayi', name: '王化一', num: 9, pos: 'PF', shooting: 66, speed: 66, strength: 80, defense: 68, dribbling: 56, jumping: 64 },
      { id: 'suimran', name: '孙岩松', num: 11, pos: 'C', shooting: 60, speed: 58, strength: 84, defense: 72, dribbling: 42, jumping: 60 },
      { id: 'young', name: '约瑟夫·杨', num: 1, pos: 'SG', shooting: 86, speed: 90, strength: 72, defense: 66, dribbling: 90, jumping: 82 },
      { id: 'makar', name: '梅克', num: 5, pos: 'C', shooting: 66, speed: 68, strength: 84, defense: 82, dribbling: 50, jumping: 78 },
      { id: 'zenglingxuan', name: '曾令煊', num: 7, pos: 'SG', shooting: 70, speed: 74, strength: 66, defense: 64, dribbling: 70, jumping: 68 },
      { id: 'zhangxun', name: '张旭', num: 10, pos: 'SF', shooting: 68, speed: 72, strength: 70, defense: 66, dribbling: 66, jumping: 70 },
      { id: 'lifuzheng', name: '李富政', num: 2, pos: 'PG', shooting: 62, speed: 78, strength: 58, defense: 64, dribbling: 76, jumping: 66 },
    ]
  },
  {
    id: 'jiangsu',
    name: '江苏肯帝亚',
    abbr: '江苏',
    color: '#003d7c',
    players: [
      { id: 'wuguanxi2', name: '吴冠希', num: 11, pos: 'C', shooting: 64, speed: 62, strength: 86, defense: 80, dribbling: 48, jumping: 68 },
      { id: 'liutao', name: '刘志轩', num: 7, pos: 'SG', shooting: 78, speed: 72, strength: 72, defense: 74, dribbling: 76, jumping: 64 },
      { id: 'cuixialong', name: '崔晓龙', num: 5, pos: 'PG', shooting: 70, speed: 84, strength: 68, defense: 70, dribbling: 82, jumping: 72 },
      { id: 'majianhao', name: '马建豪', num: 1, pos: 'SF', shooting: 72, speed: 76, strength: 68, defense: 66, dribbling: 70, jumping: 74 },
      { id: 'yanpengfei2', name: '闫鹏飞', num: 9, pos: 'PF', shooting: 66, speed: 66, strength: 80, defense: 70, dribbling: 58, jumping: 64 },
      { id: 'blakeney', name: '布莱克尼', num: 2, pos: 'SG', shooting: 88, speed: 88, strength: 76, defense: 70, dribbling: 86, jumping: 82 },
      { id: 'wulong', name: '吴龙', num: 4, pos: 'PG', shooting: 64, speed: 80, strength: 58, defense: 64, dribbling: 78, jumping: 66 },
      { id: 'xumengxun', name: '许梦君', num: 3, pos: 'SF', shooting: 68, speed: 72, strength: 68, defense: 66, dribbling: 66, jumping: 68 },
      { id: 'zhaoxuzhou', name: '赵旭洲', num: 10, pos: 'C', shooting: 56, speed: 55, strength: 84, defense: 72, dribbling: 38, jumping: 58 },
      { id: 'zhangxiwei', name: '张稀伟', num: 6, pos: 'PF', shooting: 62, speed: 64, strength: 78, defense: 68, dribbling: 54, jumping: 62 },
    ]
  },
  {
    id: 'tongxi',
    name: '南京头排苏酒',
    abbr: '南京',
    color: '#002b5c',
    players: [
      { id: 'linwei', name: '林葳', num: 23, pos: 'SG', shooting: 86, speed: 84, strength: 70, defense: 68, dribbling: 80, jumping: 78 },
      { id: 'wanglanjin', name: '王岚嵚', num: 8, pos: 'PG', shooting: 74, speed: 86, strength: 64, defense: 72, dribbling: 88, jumping: 70 },
      { id: 'bryant', name: '布莱恩特', num: 0, pos: 'PF', shooting: 72, speed: 74, strength: 84, defense: 78, dribbling: 64, jumping: 80 },
      { id: 'zengfanri', name: '曾繁日', num: 15, pos: 'C', shooting: 58, speed: 60, strength: 86, defense: 74, dribbling: 42, jumping: 64 },
      { id: 'zhaobaozhen', name: '赵柏清', num: 13, pos: 'PF', shooting: 74, speed: 70, strength: 80, defense: 70, dribbling: 62, jumping: 72 },
      { id: 'wuTingjia', name: '邬挺嘉', num: 4, pos: 'SG', shooting: 72, speed: 74, strength: 64, defense: 66, dribbling: 72, jumping: 66 },
      { id: 'liuhang', name: '刘航', num: 7, pos: 'SF', shooting: 66, speed: 74, strength: 70, defense: 66, dribbling: 66, jumping: 70 },
      { id: 'blakeney2', name: '布莱克尼', num: 2, pos: 'SG', shooting: 88, speed: 88, strength: 76, defense: 70, dribbling: 86, jumping: 82 },
      { id: 'wangrui', name: '王睿', num: 10, pos: 'PF', shooting: 64, speed: 66, strength: 76, defense: 68, dribbling: 56, jumping: 66 },
      { id: 'yanghaoyu', name: '杨皓宇', num: 5, pos: 'PG', shooting: 62, speed: 80, strength: 58, defense: 64, dribbling: 76, jumping: 68 },
    ]
  },
  {
    id: 'jilin',
    name: '吉林九台农商',
    abbr: '吉林',
    color: '#c8102e',
    players: [
      { id: 'jiangweize', name: '姜伟泽', num: 13, pos: 'SG', shooting: 88, speed: 84, strength: 66, defense: 68, dribbling: 82, jumping: 72 },
      { id: 'jiangyuxing', name: '姜宇星', num: 5, pos: 'SF', shooting: 76, speed: 82, strength: 78, defense: 76, dribbling: 78, jumping: 80 },
      { id: 'lidong', name: '李安', num: 12, pos: 'C', shooting: 64, speed: 58, strength: 86, defense: 76, dribbling: 44, jumping: 60 },
      { id: 'cuijinming', name: '崔晋铭', num: 3, pos: 'PG', shooting: 72, speed: 80, strength: 66, defense: 72, dribbling: 82, jumping: 68 },
      { id: 'zhongChen', name: '钟诚', num: 21, pos: 'PF', shooting: 70, speed: 64, strength: 84, defense: 78, dribbling: 58, jumping: 62 },
      { id: 'daixuanbo', name: '代怀博', num: 6, pos: 'PF', shooting: 74, speed: 68, strength: 78, defense: 68, dribbling: 60, jumping: 68 },
      { id: 'junior', name: '琼斯', num: 55, pos: 'SG', shooting: 80, speed: 88, strength: 84, defense: 78, dribbling: 90, jumping: 82 },
      { id: 'liujiantao', name: '刘天意', num: 1, pos: 'SF', shooting: 68, speed: 74, strength: 68, defense: 66, dribbling: 68, jumping: 70 },
      { id: 'wangzixu', name: '王梓旭', num: 8, pos: 'PG', shooting: 64, speed: 78, strength: 60, defense: 66, dribbling: 76, jumping: 66 },
      { id: 'dinghaoran', name: '丁浩然', num: 9, pos: 'PF', shooting: 62, speed: 66, strength: 76, defense: 66, dribbling: 54, jumping: 64 },
    ]
  },
  {
    id: 'tianjin',
    name: '天津先行者',
    abbr: '天津',
    color: '#003893',
    players: [
      { id: 'linqian', name: '林庭谦', num: 0, pos: 'PG', shooting: 78, speed: 86, strength: 66, defense: 74, dribbling: 88, jumping: 74 },
      { id: 'shideshuai', name: '时德帅', num: 10, pos: 'PF', shooting: 74, speed: 72, strength: 80, defense: 74, dribbling: 64, jumping: 72 },
      { id: 'terry', name: '田雨', num: 7, pos: 'SF', shooting: 76, speed: 74, strength: 72, defense: 68, dribbling: 70, jumping: 72 },
      { id: 'desau', name: '孟子凯', num: 1, pos: 'PF', shooting: 72, speed: 72, strength: 76, defense: 68, dribbling: 62, jumping: 72 },
      { id: 'dushao', name: '杜思远', num: 2, pos: 'C', shooting: 60, speed: 58, strength: 84, defense: 72, dribbling: 42, jumping: 60 },
      { id: 'james', name: '大卫·詹姆斯', num: 31, pos: 'PF', shooting: 76, speed: 78, strength: 86, defense: 80, dribbling: 68, jumping: 82 },
      { id: 'liyizhen', name: '李荣培', num: 5, pos: 'SG', shooting: 72, speed: 76, strength: 68, defense: 68, dribbling: 74, jumping: 70 },
      { id: 'guanderen', name: '谷泽浴', num: 3, pos: 'PG', shooting: 66, speed: 82, strength: 60, defense: 66, dribbling: 80, jumping: 68 },
      { id: 'zhangyunmeng', name: '张云梦', num: 6, pos: 'SF', shooting: 68, speed: 74, strength: 68, defense: 66, dribbling: 68, jumping: 70 },
      { id: 'lairongpei', name: '赖俊豪', num: 9, pos: 'C', shooting: 58, speed: 60, strength: 82, defense: 70, dribbling: 40, jumping: 64 },
    ]
  },
  {
    id: 'sichuan',
    name: '四川锦城',
    abbr: '四川',
    color: '#003d7c',
    players: [
      { id: 'zuolian', name: '左朕年', num: 13, pos: 'SF', shooting: 74, speed: 74, strength: 76, defense: 68, dribbling: 68, jumping: 74 },
      { id: 'hanyu', name: '韩硕', num: 33, pos: 'PG', shooting: 72, speed: 72, strength: 66, defense: 74, dribbling: 80, jumping: 62 },
      { id: 'jinganyi', name: '景菡一', num: 1, pos: 'SG', shooting: 72, speed: 78, strength: 70, defense: 68, dribbling: 74, jumping: 74 },
      { id: 'zhangdayu', name: '张大宇', num: 15, pos: 'C', shooting: 62, speed: 58, strength: 84, defense: 74, dribbling: 44, jumping: 60 },
      { id: 'suduo', name: '苏若禹', num: 7, pos: 'PF', shooting: 64, speed: 64, strength: 82, defense: 70, dribbling: 52, jumping: 62 },
      { id: 'gordon', name: '高登', num: 2, pos: 'SG', shooting: 84, speed: 88, strength: 74, defense: 68, dribbling: 86, jumping: 78 },
      { id: 'xufeng', name: '卢艺文', num: 11, pos: 'SF', shooting: 68, speed: 72, strength: 68, defense: 64, dribbling: 66, jumping: 68 },
      { id: 'mengtianyi', name: '孟天艺', num: 5, pos: 'PF', shooting: 66, speed: 68, strength: 76, defense: 66, dribbling: 56, jumping: 66 },
      { id: 'yuxiaoyong', name: '于枭永', num: 8, pos: 'PG', shooting: 64, speed: 80, strength: 58, defense: 66, dribbling: 78, jumping: 68 },
      { id: 'wangxinkai', name: '王薪凯', num: 6, pos: 'SG', shooting: 70, speed: 72, strength: 64, defense: 62, dribbling: 68, jumping: 68 },
    ]
  },
  {
    id: 'ningbo',
    name: '宁波町渥',
    abbr: '宁波',
    color: '#0066cc',
    players: [
      { id: 'wangzhigang', name: '王治郅之子', num: 3, pos: 'PG', shooting: 66, speed: 80, strength: 60, defense: 66, dribbling: 78, jumping: 68 },
      { id: 'liyu', name: '李原宇', num: 1, pos: 'PF', shooting: 68, speed: 64, strength: 82, defense: 70, dribbling: 54, jumping: 62 },
      { id: 'wangchen', name: '王成', num: 5, pos: 'SF', shooting: 68, speed: 72, strength: 70, defense: 66, dribbling: 66, jumping: 70 },
      { id: 'zhangbiaa', name: '张彪', num: 7, pos: 'PF', shooting: 66, speed: 66, strength: 78, defense: 68, dribbling: 56, jumping: 64 },
      { id: 'ninghongyu', name: '宁鸿宇', num: 9, pos: 'C', shooting: 58, speed: 56, strength: 84, defense: 72, dribbling: 40, jumping: 58 },
      { id: 'mitch', name: '米切尔', num: 2, pos: 'SG', shooting: 76, speed: 82, strength: 74, defense: 72, dribbling: 80, jumping: 76 },
      { id: 'jiangshuai', name: '姜帅', num: 4, pos: 'PG', shooting: 62, speed: 78, strength: 58, defense: 64, dribbling: 76, jumping: 66 },
      { id: 'wangxiang', name: '王向彬', num: 6, pos: 'SG', shooting: 64, speed: 72, strength: 64, defense: 64, dribbling: 68, jumping: 68 },
      { id: 'wangkun', name: '王坤', num: 8, pos: 'SF', shooting: 66, speed: 70, strength: 68, defense: 64, dribbling: 64, jumping: 68 },
      { id: 'maxiaolong', name: '马晓龙', num: 10, pos: 'C', shooting: 54, speed: 54, strength: 82, defense: 68, dribbling: 38, jumping: 56 },
    ]
  },
]

// 工具函数
function getAllPlayers() {
  const all = []
  CBA_TEAMS.forEach(team => {
    team.players.forEach(player => {
      all.push({
        ...player,
        teamId: team.id,
        teamName: team.name,
        teamAbbr: team.abbr,
        teamColor: team.color,
      })
    })
  })
  return all
}

function getPlayerById(playerId) {
  for (const team of CBA_TEAMS) {
    const p = team.players.find(p => p.id === playerId)
    if (p) {
      return {
        ...p,
        teamId: team.id,
        teamName: team.name,
        teamAbbr: team.abbr,
        teamColor: team.color,
      }
    }
  }
  return null
}

function getTeams() {
  return CBA_TEAMS.map(t => ({
    id: t.id,
    name: t.name,
    abbr: t.abbr,
    color: t.color,
    playerCount: t.players.length,
  }))
}

function getPlayersByTeam(teamId) {
  const team = CBA_TEAMS.find(t => t.id === teamId)
  if (!team) return []
  return team.players.map(p => ({
    ...p,
    teamId: team.id,
    teamName: team.name,
    teamAbbr: team.abbr,
    teamColor: team.color,
  }))
}

module.exports = {
  CBA_TEAMS,
  getAllPlayers,
  getPlayerById,
  getTeams,
  getPlayersByTeam,
}
