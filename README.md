## Idea
Here is small js script for word replacements.
Works with Tampermonkey(any desktop browser) or Userscripts (safari IOS).
Json config with replacements should be store at any web source.
[https://github.com/], [https://www.npoint.io/], find your source

## config format:
config must be loaded on script start
`load_config("https://some_source/my_config.json")`

config looks this way:
```json
{
   "https://some_novel_site/my_novel/chapter_*": [
      "效果", "属性",
      "歐皇狀態", "运气状态"
   ],
   "url2": [
      "a.s.s.", "ass",
      "/(\w)\.(\w)\.(\w)\./", "$1$2$3"
   ]
}
```

## url
well, you reading some book and want to make book-specific replaces
current chapter is 
`https://tw.wa01.com/novel/pagea/lunhuileyuan-nayizhiwenzi_852.html`

### easy way *
use `*`, it solves 99% cases
`https://tw.wa01.com/novel/pagea/lunhuileyuan-nayizhiwenzi_*`
if you really have `*` in your url (some extreme cases) - then escape it `\*`
`https://tw.wa01.com/novel/\*/lunhuileyuan-nayizhiwenzi_*`
### hard way full regex
- easy way - use unique part from url, no mess with `/`
`/lunhuileyuan-nayizhiwenzi_.*/`
- full way - escape `[]^&$.()?/\+{}|*` with `\`
`https:\/\/tw\.wa01\.com\/novel\/pagea\/lunhuileyuan-nayizhiwenzi_`
- add bounds /url/
`/https:\/\/tw\.wa01\.com\/novel\/pagea\/lunhuileyuan-nayizhiwenzi_/`
- add your regex part
`/https:\/\/tw\.wa01\.com\/novel\/pagea\/lunhuileyuan-nayizhiwenzi_.+/`
- example for specific chapters
`[1][0-9]` - chapters 10 - 19
`/https:\/\/tw\.wa01\.com\/novel\/pagea\/lunhuileyuan-nayizhiwenzi_[1][0-9]/`

## replacements
they also supports regexp
`"/(?:blue|green) shadow king/i", "Цин Ган Инь"`
google `javascript regex` if want more examples
script use function `string.replaceAll(pattern, replacement)`
modifier global `g` auto inserted