/**
 * 雨量等级规则（纯函数）
 * 阈值表由调用方传入（数据层持有），此处只做等级映射。
 */

/**
 * 按阈值表把瞬时雨量（mm/h）映射为等级。
 * 阈值语义：min 含、max 不含，最后一级 max 为 null。
 * @param {number} rate 瞬时雨量 mm/h
 * @param {Array<{name:string,min:number,max:number|null}>} thresholds
 * @returns {{ index:number, name:string, threshold:object }}
 */
function rainLevelOf(rate, thresholds) {
  const list = thresholds || [];
  if (!list.length) return { index: 0, name: '', threshold: null };
  const value = Number(rate) || 0;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (value >= list[i].min) return { index: i, name: list[i].name, threshold: list[i] };
  }
  return { index: 0, name: list[0].name, threshold: list[0] };
}

export { rainLevelOf };
