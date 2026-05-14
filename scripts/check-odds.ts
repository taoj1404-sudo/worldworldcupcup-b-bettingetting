/**
 * 查看比赛赔率数据结构
 */
import http from 'http';

function request(path: string): Promise<any> {
  return new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(body); }
      });
    });
    req.end();
  });
}

async function main() {
  console.log('正在获取比赛1的赔率数据...\n');
  
  const data = await request('/api/matches/1');
  
  if (data.code !== 0) {
    console.log('❌ 获取失败:', data);
    return;
  }
  
  console.log('比赛信息:', data.data.match);
  console.log('\n赔率数据结构:');
  console.log(JSON.stringify(data.data.odds, null, 2));
  
  // 分析赔率
  const odds = data.data.odds;
  console.log('\n赔率分组:');
  
  for (const betTypeId in odds) {
    const oddsArray = odds[betTypeId];
    console.log(`  BetType ${betTypeId}: ${oddsArray.length} 个赔率`);
    if (oddsArray.length > 0) {
      console.log('    第一个赔率:', oddsArray[0]);
    }
  }
}

main().catch(console.error);
