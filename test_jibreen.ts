async function testJibreen() {
  const server = 'https://server6.mp3quran.net/jbreen/';
  const surahList = '1,2,3,4,6,7,8,10,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,30,31,32,33,34,35,36,37,38,39,40,41,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114';
  const ids = surahList.split(',').map(Number);
  
  const results = [];
  for (const id of ids) {
    const padded = String(id).padStart(3, '0');
    const url = `${server}${padded}.mp3`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.status !== 200) {
        results.push({ id, status: res.status });
      }
    } catch (err: any) {
      results.push({ id, error: err.message });
    }
  }
  console.log("Failed surahs count:", results.length);
  console.log("Failed details:", results);
}
testJibreen();
