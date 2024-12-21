
## Install
Just copy replacement.js to Tampermonkey / Userscripts.<br />
Change url to your config.<br />

# Idea
Here is small js script for word replacements.
- replacements stored at json file, which loaded by url
- support regular expressions
- flexible json design - create categories / subcategories
- flexible url matching - you can specify web_book chapters for specific replacements as example
- split json on multiple json files and use `include`, you can add configs from other ppl

# Script Config
it's small config at the beginning of the scirpt
```js
const config = {
   "json_url": "https://api.npoint.io/adca32df1622919ca5bd",
   "traditional_to_simple_chinese": true,
   "default_priority_level": 1,
   "reload_config_event": {
      "max_clicks": 10,
      "max_time_ms": 3000
   }
};
```
### json_url
url, with your config
- `traditional_to_simple_chinese`: `true`/`false`

Where you can store json?
-  [https://www.npoint.io/]
- you can create gist on [https://github.com/], or create repo with configs and make links to raw file

### traditional_to_simple_chinese
`true`, `false`<br />
I readed chinese book with  translation dubbing. I saw as original, as translated text.<br />
So I added option to convert hard readable hieroglyphs to there simple version
### reload_config_event
```json
   "reload_config_event": {
      "max_clicks": 10,
      "max_time_ms": 3000
   }
```
Here are settings for reloading json config.<br />
As example - you reading text, made replacement in config - and want to check result, without reloading page.<br />
You should click `max_clicks` times in `max_time_ms` time at any place of page.<br />
10 times in 3 sec by default.<br />
Script would reload config, swap text back to original state and apply new replacements.
## default_priority_level
optional, useful if you're experimenting with the order of substitutions<br />
read about `__level` in json

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
Firstly script recursively check all nodes and collect all names on all depth like `"name": {...}`<br />
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