// 當個網頁係Ready既狀態，就開始run d code
$(document).ready(function () {
  // 下面係3粒掣既code，基本上都係一樣，只係改番岩名就ok。
  // 第1粒制 - Normal
  $(".toNormal").on("click", function () {
    // 一開始因為唔知佢本身既class名，所以一次過整走d影響佢size既class。
    // 抽左出黎做一個function，係下面。
    removeIslandClass();

    // 咁之後就可以加番一個岩既class比佢，等佢轉去你想要既size
    $(".island").addClass("islandIsNormal");

    // 因為宜家係Normal狀態，就唔會有UI，所以佢地既opacity透明度係0。
    $(".islandCompact").css("opacity", "0");
    $(".islandExpanded").css("opacity", "0");
  });
  // 第2粒制 - Compact
  $(".toCompact").on("click", function () {
    removeIslandClass();
    $(".island").addClass("islandIsCompact");
    // 當係Compact既狀態，就只有.islandCompact會顯示，所以係opacity＝1。
    // .islandExpanded 要隱藏，opacity＝0。
    // 個setTimeout()係比佢delay既，就番CSS入面0.5秒既Transition。
    $(".islandExpanded").css("opacity", "0");
    setTimeout(function () {
      $(".islandCompact").css("opacity", "1");
    }, 500);
  });
  // 第3粒制 - Expanded
  $(".toExpanded").on("click", function () {
    removeIslandClass();
    $(".island").addClass("islandIsExpanded");
    $(".islandCompact").css("opacity", "0");
    setTimeout(function () {
      $(".islandExpanded").css("opacity", "1");
    }, 500);
  });
});

function removeIslandClass() {
  // 其實就係一行，移除佢.islandIsNormal / .islandIsCompact / .islandIsExpanded
  $(".island").removeClass("islandIsNormal islandIsCompact islandIsExpanded");
}
