import story from './story.json';
import type { Ending, Scene } from '../game/types';
// Authored dialogue and choices live only in story.json.
export const scenes: Scene[] = story.scenes as Scene[];
export const chapters = [
  { id: 1 as const, title: '好友申请', subtitle: '一个互助群，两个陌生账号，一座暂时安静的城。', background: 'bedroom', start: 'arrival' },
  { id: 2 as const, title: '一格信号', subtitle: '先听见你的声音，再决定要不要打开摄像头。', background: 'gate', start: 'c2-open' },
  { id: 3 as const, title: '撤回之后', subtitle: '流传的截图漏掉了半句，也漏掉了一个人的生活。', background: 'printshop', start: 'c3-open' },
  { id: 4 as const, title: '离线的夜', subtitle: '当聊天框安静下来，承诺还需要怎样履行。', background: 'balcony', start: 'c4-open' },
  { id: 5 as const, title: '见面以前', subtitle: '街道开始有声音，你准备把哪句话当面说完。', background: 'riverbank', start: 'c5-open' },
];
export const endingInfo: Record<Ending, { label: string; subtitle: string; badge: string }> = {
  'tinghe-final': { label: '同一段呼吸', subtitle: '第一次走在同一条路上，长语音终于有了不用按住的回答。', badge: '谢听禾 · 见面' },
  'xumi-final': { label: '显影的明天', subtitle: '照相馆重新开门，合照之前，先约好明天的早饭。', badge: '许弥 · 见面' },
  'friends-final': { label: '群聊没有散', subtitle: '四碗面摆在桌上，新的群名叫“这周谁有空”。', badge: '共同篇 · 友情' },
  'letter-final': { label: '离线也会想念', subtitle: '各自回到生活里，承认相遇真实，也允许关系停在这里。', badge: '个人篇 · 告别' },
};
export const finalEndingIds: Ending[] = Object.keys(endingInfo) as Ending[];
export const cgInfo = {
  bedroom: { title: '等待消息的房间', description: '旧房间、电脑与窗外的灯，长夜从这里开始。' },
  balcony: { title: '隔窗的灯', description: '楼与楼之间的距离，一段也许有人听见的风。' },
  gate: { title: '梧桐里门口', description: '采购单、折叠桌，与重新开始流动的日常。' },
  printshop: { title: '拾光照相馆', description: '照片、信封和一把等待重新坐下的椅子。' },
  riverbank: { title: '梧江步道', description: '五月的江边，那句终于可以当面说完的话。' },
} as const;
export const characterInfo = {
  tinghe: { name: '谢听禾', role: '22 岁 / 声音设计学生 / 一格信号', subtitle: '栗棕低辫、蓝色发夹、芥黄色开衫。她记录窗外的声音，也会删掉录音里自己的停顿。', quote: '“这一段别降噪了。我想知道你那边也在下雨。”' },
  xumi: { name: '许弥', role: '23 岁 / 照相馆助理 / 暂停营业', subtitle: '蓝黑短发、珊瑚发夹、青色围裙。帮别人把照片冲洗清楚，自己的计划却迟迟没有交卷。', quote: '“寄不到也先留着。信封又不会催你。”' },
};
