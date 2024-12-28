
## Установка
Установите replacement.js в Tampermonkey / Userscripts.<br />
Поменяйте json_url в скрипте на ваш собственный (отдельный файл с заменами).<br />
```js
config = {
   "json_url": "https://api.npoint.io/adca32df1622919ca5bd",
```

# О скрипте
Это скрипт для замены слов
- сами замены хранятся в отдельном json файле, который скачивается по url
- поддержка регулярных выражений
- гибкий дизайн json структуры - создавайте категории / подкатегории
- гибкое сопоставление url - можно для отдельных замен задавать отдельные главы книги
- json можно разделить на набор файлов и включать друг в друга через `include`, можно подключать чужие

# Script Config
Это небольшой конфиг в самом начале скрипта
```js
const config = {
   "json_url": "https://api.npoint.io/adca32df1622919ca5bd",
   "traditional_to_simple_chinese": true,
   "default_priority_level": 1,
   "binds": {
      "click_interval": 3000,
      "n": 3,
      "m": 2,
      "events": {
         [known_events.config_update]: [4, 4, 6, 6],
         [known_events.turn_on_off]: [6, 6, 4, 4],
      }
   }
};
```
### json_url
Это адрес url, по которому скачивается конфиг с заменами

Где можно хранть json?
-  [https://www.npoint.io/]
- можно сделать gist на [https://github.com/], или создать отдельное репо под конфиги

### traditional_to_simple_chinese
`true`, `false`<br />
Я читал книгу на китайском с дублирующим переводом. Видел китайский и русский разом.<br />
Так что добавил перевод иероглифов в их упрощенный читаемый формат

### default_priority_level
опционально, полезно если вы эксперементируете с приоритетом замен<br />
смотри раздел `__level` далее (примерно внизу)

### binds
```json
const known_events = {
   config_update: "forse_update_replacements",
   turn_on_off: "swap_on_off",
}
// ....
   "binds": {
      "click_interval": 3000,
      "n": 3,
      "m": 2,
      "events": {
         [known_events.config_update]: [4, 4, 6, 6],
         [known_events.turn_on_off]: [6, 6, 4, 4],
      }
   }
```
Binds - settings - where and how click to run some options.<br />
I want to work them as on PC, as on IOS - and don't want to add GUI buttons.<br />
<br />
Idea is following:
- Screen splitted on **n** x **m** rectangles
- each rectangle get it's own number 1, ... n x m
- from left-> right, from up->down<br />

Example for n=3, m=2<br />
```text
   -------------
   | 1 | 2 | 3 |
   |---|---|---|
   | 4 | 5 | 6 |
   -------------
```

Next step is to set option - what to do and order - which block clicks expected.
<br />
#### click_interval
It's interval, where you have to do all clicks.
`"click_interval": 3000` - 3 seconds
<br />
#### indexes
`[4, 4, 6, 6]`<br />
Expected order of clicks. <br />
At this case - you should tap twice in left bottom screen <br />
And after that - twice in right bottom.
<br />
#### known options
- config_update - script would load json config again and update <br />replacements (If you change config and don't want to reload page)
- turn_on_off 
	<br />**off** - script discard changes and stop works on text updates, 
	<br />**on** - works again, usefull if you want to check original values before script.

# Json Config
config looks this way:
```json
{
   "__urls": [
      "https://some_novel_site/my_novel/chapter_*"
   ],
   "smthA": {
      "a": "b",
      "smthB": {
         "smthC": {
            "x": "y",
         }
      }
   },
   "smthD": {
      "/val(.+)/": "test $1"
   }
}
```
Check here mine current config:<br />
[https://www.npoint.io/docs/adca32df1622919ca5bd]<br />
[https://www.npoint.io/docs/97ef86b1e99dfc26c72d]<br />

You can create so much nested nodes with any names, as you want.<br />
Script recursively parse json and collect pairs 
```
arr = [
	["a", "b"],
	["x", "y"],
	["/val(.+)/", "test $1"],
]
```

## Replacements
Replacement have 2 options.
- basic form: `string: string`
- random form: `string: [str1, str2, ...str_n]`

Only this things would be collected.
### Random replacements
`"x": ["a", "b", "c"]`<br />
`"老三", ["Third Bro", "Younger Bro"],`<br />
Random value would be select for replacement.<br />
"AAx" -> "AAb"<br />
"AAx" -> "AAc"<br />

### Regex support
Example:<br />
	`"/(\\d)o/": "$10"` - change o after digit to 0<br />
	`2o` -> `20`, `9o` -> `90`
- start and end with `/`
- escape with `\\`
- all flags supported `i`, `u`, e.t.c.
- flag global `g` auto inserted
- multiline would work only if all text lays in one html element - paragraph as example, depends on page

google `javascript regex` if want more examples

### Space problem
- you have string `ab`
- you created replacements `"a": "Alice", "b": "Bob"`
basicaly result would be `AliceBob`<br />
but script converts it to `Alice Bob`<br />
usefull for hieroglyphs without spaces<br />

rules to convertion:
- replacement like `Alice` - start from letter, not hieroglyph
- it search - where to insert `Alice` "XXX<--aXXX"
- if there is letter too - add space

## Key Words
There are following key words:
- `__urls` - ignore node if not passed
- `__include` - add other nodes from higher level, or url to load another json
- `__level` - set priority level, probably some replacements should work first, another later

## __urls
example:
```json
{
	"common_replacements": {
		...
		"__urls": ["*"],
	}
	"MyNovel1": {
		...
		"arc 5": {
			"specific per concrete chapters": {
				"x": "y",
		         // chapters 1159-1212
		         "__urls": [
		            "1159",
		            "/11[6-9][0-9]/",
		            "/120[0-9]/",
		            "/121[0-2]/",
		         ],				
			}
		}
		"__urls": [
			"https://some_novel_site/my_novel/chapter_*",
			"https://another_source_with_novel/chapt*"
		]
	}
}
```
### how script work with "__url", nested behaviour
Script recursively look in each node `{}`. <br />
If it see `__urls` and they passed - it started to collect replacements in that node.<br />
<br />
You can add `__urls` in any subnode too. <br />
If they not passed - that subnode would be ignored.<br />
Usefull for specific chapters of book/ pages, check example.

### url format
#### easy way *
use `*`, it solves 99% cases<br />
`https://tw.wa01.com/novel/pagea/lunhuileyuan-nayizhiwenzi_*`<br />
if you really have `*` in your url (some extreme cases) - then escape it `\\*`<br />
`https://tw.wa01.com/novel/\\*/lunhuileyuan-nayizhiwenzi_*`
#### hard way full regex
- easy way - use unique part from url, no mess with `/`<br />
`/lunhuileyuan-nayizhiwenzi_.*/`
- full way - escape `[]^&$.()?/\+{}|*` with `\\`
`https:\\/\\/tw\\.wa01\\.com\\/novel\\/pagea\\/lunhuileyuan-nayizhiwenzi_`
- add bounds /url/ - to point that this is regular expression<br />
`/https:\\/\\/tw\\.wa01\\.com\\/novel\\/pagea\\/lunhuileyuan-nayizhiwenzi_/`
- add your regex part<br />
`/https:\\/\\/tw\\.wa01\\.com\\/novel\\/pagea\\/lunhuileyuan-nayizhiwenzi_.+/`
- example for specific chapters<br />
`[1][0-9]` - chapters 10 - 19<br />
`/https:\\/\\/tw\\.wa01\\.com\\/novel\\/pagea\\/lunhuileyuan-nayizhiwenzi_[1][0-9]/`

## __include
example:
```json
{
	"commonA": {...},
	"commonB": {...},
	"Book1": {
		...
		"__include": {
			"smth_name": "commonA",
			"blockB": "commonB",
			"engeneer terms": "https://some_server/engeneer_terms.json"
		}
	},
	"news_portal": {
    	...
		"__include": {"commonA": "commonA"}
	}
}
```

As you see - it allows to include outer nodes or even load other jsons.
### how it works
Firstly script recursively check all nodes <br />
and collect all names on all depth like `"name": {...}`<br />
Later script just insert in node with `__include` all data by aliases

Example:<br />
json by url1
```json
{"x": "y", "z": {"a": "b"}} // url json
```
```json
{
	"commonA": {"nodeA": {"n": "m"}},
	"ExampleNode": {
		...
		"__include": {
			"alias1": "nodeA",
			"engeneer_terms": "url1",
		}		
	}
}
```
`ExampleNode` converted to
```json
{
	...
	"ExampleNode": {
		...
		"alias1": {"n": "m"},
		"engeneer_terms": {"x": "y", "z": {"a": "b"}}, 
		"__include": {...},
	}	
}
```

## __level & order

### about order of replacements
As earlier was mentioned - script build simple array from json
```
arr = [
	["a1", "b1"],
	["a2", "b2"],
	["a3", "b3"],
]
```
and apply replacements in same order

### automatic order
Example:
```
text = "xxAAxx"
json = {"A": "B", "AA": "CC"}
replacements = [
	["A", "B"],
	["AA", "CC"],
]
```
we expect `xxCCxx`<br />
basically result would be `xxBBxx`

But this problem is solved.
1. if adding key contains one of the earlier added - it would be moved before that point.<br />
```json
[
	...,
   ->	
	["A", "B"],
	...,
]
```
2.  if exactly same key exists, new won't be added

**Problem**
But regular expressions can't be auto checked.
```json
{
	"100": "hundred",
	"/o\d/": "0$1",
}
```
we expected `"1o0" -> "hundred"`<br />
but if replacements collected in wrong order (which json not guaranteed)
```
replacements = [
	["100", "hundred"],
	["/o\d/", "o$1"],	
]
```
here **__level** comes
```json
{
	"100": "hundred",
	fixes: {
		"/o\d/": "0$1",
		"__level": 0,
	}
}
```
### __level
Example:
```json
{
	"first_order_fixes": {
		...,
		"__level": 0,
	},
	...
	"source_which_override_mine_replacements": {
		"__include": {
			"fiction terms": "some_url",
		}
		"__level": 2,
	}
}
	
```
`__level` allow you to solve problems with order<br />
Default level set in javascript config: 
```js
let config = {
	...
	"default_priority_level":  1,
}
```
All replacements collected independently by this levels.

```js
let arr = [
	"-10": [['a1', 'a2'], ['a3', 'a4'], ...]
	"0": [['b1', 'b2'], ['b3', 'b4'], ...]
	"1": [['c1', 'c2'], ['c3', 'c4'], ...]
	"5": [['d', 'd2'], ['d3', 'd4'], ...]	
]
```
Autoorder, checking same key - works only on the same lvl<br />
Finally they squashed in one array, ordered by levels
```
[
	'a1','a2',
	...,
	'b1','b2',
	...,
	'd1','d2',
	...
]
```

**Inheriting**
Level is inherited by child nodes.<br />
Here is example.
```
{
	"a1": "a2", // default level 1
	"a": {
		"b1": "b2" // level 1
		"b": {
			"c1": "c2", // level -100
			"c": {
				"d1": "d2", // level -100
				"d": {
					"e1": "e2", // level 5
					"f": {
						"f1": f2, // level 5
					}
					"__level": 5
				}
			}
			"__level": -100
		}
	},
	"x": {
		"x1": "x2", // level 3
		"__level": 3
	}
}
```