const fs = require('fs');

try {
  const html = fs.readFileSync('helper.html', 'utf8');
  console.log(`Loaded HTML, length: ${html.length}`);

  let meanings = [];
  const word = "helper";

  // --- 策略3 Copy ---
  // 结构: <div id="ExpFCchild" class="expDiv"><!--...--><i>n.</i> 助手</div>
  const fcRegex = /<div id="ExpFCchild"[^>]*>([\s\S]*?)<\/div>/;
  const fcMatch = html.match(fcRegex);

  if (fcMatch) {
    console.log("Strategy 3: ExpFCchild match found!");
    let rawContent = fcMatch[1];
    console.log("Raw content:", rawContent);

    // 提取 <i>n.</i> 结构
    const posMatches = [...rawContent.matchAll(/<i>(.*?)<\/i>/g)];

    if (posMatches.length > 0) {
      // 如果有 <i> 标签，通常结构是 <i>n.</i> 释义
      // 我们需要按 <i> 分割
      let parts = rawContent.split(/<i>.*?<\/i>/);
      // parts[0] 是空 (如果开头就是<i>)，parts[1] 是第一个词性的释义

      parts.forEach((part, index) => {
        if (index === 0 && !part.trim()) return; // 跳过开头的空串
        // 找到对应的词性 (注意 split 会导致 parts 比 matches 多一个，如果开头是 <i>)
        // matches[0] 对应 parts[1]
        let pos = (index > 0 && posMatches[index - 1]) ? posMatches[index - 1][1] : '';

        let def = part.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, '').trim();
        if (def) {
          meanings.push({
            partOfSpeech: pos,
            definitions: [def]
          });
        }
      });
    } else {
      // 没有 <i>，直接全是文本
      let def = rawContent.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, '').trim();
      if (def) {
        meanings.push({
          partOfSpeech: '',
          definitions: [def]
        });
      }
    }
  } else {
    console.log("Strategy 3: ExpFCchild match NOT found");
  }

  console.log("Parsed Meanings:", JSON.stringify(meanings, null, 2));

} catch (e) {
  console.error("Error:", e);
}
