const puppeteer = require('puppeteer');
const firebase = require('firebase');
const { USERNAME, PASSWORD, FBCONFIG } = require('./login.js')


firebase.initializeApp(FBCONFIG);
const db = firebase.database()

let imagesArr = []


const fetchData = async function(username, password) {
    try {
        await puppeteer.launch({ headless: true }).then(async browser => {
            let pageCounter = 1;
            let images = []
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 })
            await page.goto('https://www.shutterstock.com/pl/account/library');
            await page.waitForSelector('#login-username');
            console.log('login page...');
            await page.focus('#login-username');
            await page.keyboard.type(username);
            await page.focus('#login-password');
            await page.keyboard.type(password);
            await Promise.all([
                page.click('#login'),
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
            ]);
            let totalEl = '#content > div > div > main > div > div > div:nth-child(2) > span > div > span > span:nth-child(2)'
            await page.waitForSelector(totalEl);
            let totalPages = await page.$eval(totalEl, (element) => {
                return element.innerHTML
            });
            console.log(`total pages - ${totalPages}`);
            await page.waitForSelector('button.o_sstk1-Paginate_linkNext');
            console.log(`...galery ${pageCounter}...`);
            const sel = '[data-test-ref="library-item-image"]'
            images = await page.evaluate((sel) => {
                let elements = Array.from(document.querySelectorAll(sel));
                let links = elements.map(element => {
                    return {
                        id: element.alt,
                        link: element.src,
                    }
                })
                return links;
            }, sel);
            imagesArr.push(...images);

            while (pageCounter < 7) {
                pageCounter += 1;
                await page.click('button.o_sstk1-Paginate_linkNext');
                await page.waitForSelector('button.o_sstk1-Paginate_linkNext');
                console.log(`...galery ${pageCounter} of ${totalPages}...`);
                images = await page.evaluate((sel) => {
                    let elements = Array.from(document.querySelectorAll(sel));
                    let links = elements.map(element => {
                        return {
                            id: element.alt,
                            link: element.src,
                        }
                    })
                    return links;
                }, sel);
                console.log(`at page ${pageCounter} grabbed ${images.length} elements`)
                imagesArr.push(...images);
            }
            await browser.close();
        });
        const writeData = (arr) => {
            arr.map(el => {
                db.ref(`photos/${el.id}`).set({
                    id: el.id,
                    link: el.link,
                })
            })
        }
        writeData(imagesArr);
        return `loaded ${imagesArr.length} last assets`
    } catch (error) {
        return `error: ${error}`
    }
}

fetchData(USERNAME, PASSWORD).then(msg => console.log(msg))