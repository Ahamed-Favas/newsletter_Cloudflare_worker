async function fn(html) {
    const text = html.replace(/<[^>]*>/g, '');
    if (!text.trim()){
        console.log("nothing")
        return
    }
    console.log(text)
    return
}

fn(`<a href="https://timesofindia.indiatimes.com/india/aur-lado-aapas-mein-omar-abdullah-takes-dig-at-rahul-kejriwal-as-bjp-takes-lead-in-delhi-elections/articleshow/118051014.cms"><img border="0" hspace="10" align="left" style="margin-top:3px;margin-right:5px;" src="https://timesofindia.indiatimes.com/photo/118051014.cms" /></a>ww`)