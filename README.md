## Idea
Here is small js script for word replacements.<br />
Works with Tampermonkey(any desktop browser) or Userscripts (safari IOS).<br />
Json config with replacements should be store at any web source.<br />
[https://github.com/], [https://www.npoint.io/], find your source<br />

## Install
Just copy replacement.js to Tampermonkey / Userscripts.<br />
Change url to your config.<br />

## config format:
config must be loaded on script start<br />
`load_config("https://some_source/my_config.json")`

config looks this way:<br />
```json
{
   "https://some_novel_site/my_novel/chapter_*": [
      "效果", "属性",
      "歐皇狀態", "运气状态"
   ],
   "url2": [
      "a.s.s.", "ass",
      "/(\\d+)～(\\d+)/", "($1~$2)",
      "/(?:\\s|^)(.{1,5})～(?:\\s|$)/", "⟦ $1 ⟧",
      "國足三人", ["Troitsa Of Hooligans ", "Troitsa Of Idiots ","Trinity of Jesters "],
      "космически", "пространственны",
      "космическ", "пространственн",
   ]
}
```

## url
well, you reading some book and want to make book-specific replaces<br />
current chapter is <br />
`https://tw.wa01.com/novel/pagea/lunhuileyuan-nayizhiwenzi_852.html`

### easy way *
use `*`, it solves 99% cases<br />
`https://tw.wa01.com/novel/pagea/lunhuileyuan-nayizhiwenzi_*`<br />
if you really have `*` in your url (some extreme cases) - then escape it `\\*`<br />
`https://tw.wa01.com/novel/\\*/lunhuileyuan-nayizhiwenzi_*`
### hard way full regex
- easy way - use unique part from url, no mess with `/`
`/lunhuileyuan-nayizhiwenzi_.*/`
- full way - escape `[]^&$.()?/\+{}|*` with `\\` <br />
`https:\\/\\/tw\\.wa01\\.com\\/novel\\/pagea\\/lunhuileyuan-nayizhiwenzi_`
- add bounds /url/<br />
`/https:\\/\\/tw\\.wa01\\.com\\/novel\\/pagea\\/lunhuileyuan-nayizhiwenzi_/`
- add your regex part
`/https:\\/\\/tw\\.wa01\\.com\\/novel\\/pagea\\/lunhuileyuan-nayizhiwenzi_.+/`
- example for specific chapters
`[1][0-9]` - chapters 10 - 19<br />
`/https:\\/\\/tw\\.wa01\\.com\\/novel\\/pagea\\/lunhuileyuan-nayizhiwenzi_[1][0-9]/`

## replacements
they also supports regexp<br />
`"/(?:blue|green) shadow king/i", "Цин Ган Инь"`<br />
google `javascript regex` if want more examples<br />
script use function `string.replaceAll(pattern, replacement)`<br />
modifier global `g` auto inserted<br />

array of replacements allowed, random would be choosed<br />:
`"老三", ["Third Bro", "Younger Bro"],`<br />