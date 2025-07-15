// "handler_captcha": "i-am-not-a-bot",

// async handler_captcha() {
//    let images = click_util.get_captcha_images()
//    console.log(images)
//    if (!images) {
//       console.log('no images')
//       return
//    }
//    let image = images[0]
//    const arrayBuffer = await (await fetch(image.src)).arrayBuffer();
//    const decoder = new TextDecoder();
//    const str = decoder.decode(arrayBuffer);
//    console.log(str)
// }

// export function get_captcha_images() {
//    let images = jq('img[src^="/i-am-not-a-bot"]')
//       .filter(img => is_visible(img))
//    if (images.length === 0)
//       return null
//    return images
// }