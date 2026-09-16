#!/usr/bin/env node

/**
 * Downloads animal images from Wikimedia Commons via the Wikipedia API.
 * Supports foxes, cats, and dogs categories.
 *
 * Usage:
 *   node generate-data.js                    # Download all categories
 *   node generate-data.js --category=foxes   # Download foxes only
 *   node generate-data.js --category=cats    # Download cats only
 *   node generate-data.js --category=dogs    # Download dogs only
 *
 * Images are saved to ./images/{category}/ and data files to ./data/{category}.json.
 * Existing images are skipped (delete the directory to re-download all).
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

// --- Category definitions ---

const FOXES = [
  { name: 'Ethiopian Wolf', scientific: 'Canis simensis', wiki: 'Ethiopian_wolf', group: 'Canis' },
  { name: 'Crab-eating Fox', scientific: 'Cerdocyon thous', wiki: 'Crab-eating_fox', group: 'Cerdocyon' },
  { name: 'Falkland Islands Wolf', scientific: 'Dusicyon australis', wiki: 'Falkland_Islands_wolf', group: 'Dusicyon' },
  { name: 'Culpeo', scientific: 'Lycalopex culpaeus', wiki: 'Culpeo', group: 'Lycalopex' },
  { name: "Darwin's Fox", scientific: 'Lycalopex fulvipes', wiki: "Darwin's_fox", group: 'Lycalopex' },
  { name: 'South American Gray Fox', scientific: 'Lycalopex griseus', wiki: 'South_American_gray_fox', group: 'Lycalopex' },
  { name: 'Pampas Fox', scientific: 'Lycalopex gymnocercus', wiki: 'Pampas_fox', group: 'Lycalopex' },
  { name: 'Sechuran Fox', scientific: 'Lycalopex sechurae', wiki: 'Sechuran_fox', group: 'Lycalopex' },
  { name: 'Hoary Fox', scientific: 'Lycalopex vetulus', wiki: 'Hoary_fox', group: 'Lycalopex' },
  { name: 'Bat-eared Fox', scientific: 'Otocyon megalotis', wiki: 'Bat-eared_fox', group: 'Otocyon' },
  { name: 'Gray Fox', scientific: 'Urocyon cinereoargenteus', wiki: 'Gray_fox', group: 'Urocyon' },
  { name: 'Island Fox', scientific: 'Urocyon littoralis', wiki: 'Island_fox', group: 'Urocyon' },
  { name: 'Arctic Fox', scientific: 'Vulpes lagopus', wiki: 'Arctic_fox', group: 'Vulpes' },
  { name: 'Bengal Fox', scientific: 'Vulpes bengalensis', wiki: 'Bengal_fox', group: 'Vulpes' },
  { name: "Blanford's Fox", scientific: 'Vulpes cana', wiki: "Blanford's_fox", group: 'Vulpes' },
  { name: 'Cape Fox', scientific: 'Vulpes chama', wiki: 'Cape_fox', group: 'Vulpes' },
  { name: 'Corsac Fox', scientific: 'Vulpes corsac', wiki: 'Corsac_fox', group: 'Vulpes' },
  { name: 'Fennec Fox', scientific: 'Vulpes zerda', wiki: 'Fennec_fox', group: 'Vulpes' },
  { name: 'Kit Fox', scientific: 'Vulpes macrotis', wiki: 'Kit_fox', group: 'Vulpes' },
  { name: 'Pale Fox', scientific: 'Vulpes pallida', wiki: 'Pale_fox', group: 'Vulpes' },
  { name: "R\u00fcppell's Fox", scientific: 'Vulpes rueppellii', wiki: "R%C3%BCppell's_fox", group: 'Vulpes' },
  { name: 'Red Fox', scientific: 'Vulpes vulpes', wiki: 'Red_fox', group: 'Vulpes' },
  { name: 'Swift Fox', scientific: 'Vulpes velox', wiki: 'Swift_fox', group: 'Vulpes' },
  { name: 'Tibetan Sand Fox', scientific: 'Vulpes ferrilata', wiki: 'Tibetan_sand_fox', group: 'Vulpes' },
];

const CATS = [
  // Shorthair
  { name: 'Abyssinian', scientific: 'Felis catus', wiki: 'Abyssinian_(cat)', group: 'Shorthair' },
  { name: 'American Shorthair', scientific: 'Felis catus', wiki: 'American_Shorthair', group: 'Shorthair' },
  { name: 'British Shorthair', scientific: 'Felis catus', wiki: 'British_Shorthair', group: 'Shorthair' },
  { name: 'Burmese', scientific: 'Felis catus', wiki: 'Burmese_(cat)', group: 'Shorthair' },
  { name: 'Chartreux', scientific: 'Felis catus', wiki: 'Chartreux', group: 'Shorthair' },
  { name: 'European Shorthair', scientific: 'Felis catus', wiki: 'European_Shorthair', group: 'Shorthair' },
  { name: 'Exotic Shorthair', scientific: 'Felis catus', wiki: 'Exotic_Shorthair', group: 'Shorthair' },
  { name: 'Havana Brown', scientific: 'Felis catus', wiki: 'Havana_Brown', group: 'Shorthair' },
  { name: 'Korat', scientific: 'Felis catus', wiki: 'Korat', group: 'Shorthair' },
  { name: 'Manx', scientific: 'Felis catus', wiki: 'Manx_(cat)', group: 'Shorthair' },
  { name: 'Russian Blue', scientific: 'Felis catus', wiki: 'Russian_Blue', group: 'Shorthair' },
  { name: 'Snowshoe', scientific: 'Felis catus', wiki: 'Snowshoe_(cat)', group: 'Shorthair' },
  { name: 'Singapura', scientific: 'Felis catus', wiki: 'Singapura_(cat)', group: 'Shorthair' },
  { name: 'Bombay', scientific: 'Felis catus', wiki: 'Bombay_(cat)', group: 'Shorthair' },
  // Longhair
  { name: 'Birman', scientific: 'Felis catus', wiki: 'Birman', group: 'Longhair' },
  { name: 'Himalayan', scientific: 'Felis catus', wiki: 'Himalayan_(cat)', group: 'Longhair' },
  { name: 'Maine Coon', scientific: 'Felis catus', wiki: 'Maine_Coon', group: 'Longhair' },
  { name: 'Norwegian Forest Cat', scientific: 'Felis catus', wiki: 'Norwegian_Forest_cat', group: 'Longhair' },
  { name: 'Persian', scientific: 'Felis catus', wiki: 'Persian_(cat)', group: 'Longhair' },
  { name: 'Ragdoll', scientific: 'Felis catus', wiki: 'Ragdoll', group: 'Longhair' },
  { name: 'Siberian', scientific: 'Felis catus', wiki: 'Siberian_(cat)', group: 'Longhair' },
  { name: 'Somali', scientific: 'Felis catus', wiki: 'Somali_(cat)', group: 'Longhair' },
  { name: 'Turkish Angora', scientific: 'Felis catus', wiki: 'Turkish_Angora', group: 'Longhair' },
  { name: 'Turkish Van', scientific: 'Felis catus', wiki: 'Turkish_Van', group: 'Longhair' },
  { name: 'Nebelung', scientific: 'Felis catus', wiki: 'Nebelung', group: 'Longhair' },
  { name: 'York Chocolate', scientific: 'Felis catus', wiki: 'York_Chocolate', group: 'Longhair' },
  // Oriental
  { name: 'Siamese', scientific: 'Felis catus', wiki: 'Siamese_(cat)', group: 'Oriental' },
  { name: 'Balinese', scientific: 'Felis catus', wiki: 'Balinese_(cat)', group: 'Oriental' },
  { name: 'Oriental Shorthair', scientific: 'Felis catus', wiki: 'Oriental_Shorthair', group: 'Oriental' },
  { name: 'Oriental Longhair', scientific: 'Felis catus', wiki: 'Oriental_Longhair', group: 'Oriental' },
  { name: 'Tonkinese', scientific: 'Felis catus', wiki: 'Tonkinese_(cat)', group: 'Oriental' },
  { name: 'Thai', scientific: 'Felis catus', wiki: 'Thai_(cat)', group: 'Oriental' },
  { name: 'Burmilla', scientific: 'Felis catus', wiki: 'Burmilla', group: 'Oriental' },
  { name: 'Colorpoint Shorthair', scientific: 'Felis catus', wiki: 'Colorpoint_Shorthair', group: 'Oriental' },
  // Wild-looking
  { name: 'Bengal', scientific: 'Felis catus', wiki: 'Bengal_(cat)', group: 'Wild-looking' },
  { name: 'Savannah', scientific: 'Felis catus', wiki: 'Savannah_(cat)', group: 'Wild-looking' },
  { name: 'Ocicat', scientific: 'Felis catus', wiki: 'Ocicat', group: 'Wild-looking' },
  { name: 'Egyptian Mau', scientific: 'Felis catus', wiki: 'Egyptian_Mau', group: 'Wild-looking' },
  { name: 'Toyger', scientific: 'Felis catus', wiki: 'Toyger', group: 'Wild-looking' },
  { name: 'Pixie-bob', scientific: 'Felis catus', wiki: 'Pixie-bob', group: 'Wild-looking' },
  { name: 'Chausie', scientific: 'Felis catus', wiki: 'Chausie', group: 'Wild-looking' },
  { name: 'Serengeti', scientific: 'Felis catus', wiki: 'Serengeti_(cat)', group: 'Wild-looking' },
  // Rex & Hairless
  { name: 'Sphynx', scientific: 'Felis catus', wiki: 'Sphynx_(cat)', group: 'Rex & Hairless' },
  { name: 'Devon Rex', scientific: 'Felis catus', wiki: 'Devon_Rex', group: 'Rex & Hairless' },
  { name: 'Cornish Rex', scientific: 'Felis catus', wiki: 'Cornish_Rex', group: 'Rex & Hairless' },
  { name: 'Peterbald', scientific: 'Felis catus', wiki: 'Peterbald', group: 'Rex & Hairless' },
  { name: 'LaPerm', scientific: 'Felis catus', wiki: 'LaPerm', group: 'Rex & Hairless' },
  { name: 'Lykoi', scientific: 'Felis catus', wiki: 'Lykoi', group: 'Rex & Hairless' },
  // Distinctive
  { name: 'Scottish Fold', scientific: 'Felis catus', wiki: 'Scottish_Fold', group: 'Distinctive' },
  { name: 'Munchkin', scientific: 'Felis catus', wiki: 'Munchkin_(cat)', group: 'Distinctive' },
  { name: 'American Curl', scientific: 'Felis catus', wiki: 'American_Curl', group: 'Distinctive' },
  { name: 'Japanese Bobtail', scientific: 'Felis catus', wiki: 'Japanese_Bobtail', group: 'Distinctive' },
  { name: 'Khao Manee', scientific: 'Felis catus', wiki: 'Khao_Manee', group: 'Distinctive' },
  { name: 'American Bobtail', scientific: 'Felis catus', wiki: 'American_Bobtail', group: 'Distinctive' },
  { name: 'Selkirk Rex', scientific: 'Felis catus', wiki: 'Selkirk_Rex', group: 'Distinctive' },
];

const DOGS = [
  // Sporting
  { name: 'Golden Retriever', scientific: 'Canis lupus familiaris', wiki: 'Golden_Retriever', group: 'Sporting' },
  { name: 'Labrador Retriever', scientific: 'Canis lupus familiaris', wiki: 'Labrador_Retriever', group: 'Sporting' },
  { name: 'English Cocker Spaniel', scientific: 'Canis lupus familiaris', wiki: 'English_Cocker_Spaniel', group: 'Sporting' },
  { name: 'Irish Setter', scientific: 'Canis lupus familiaris', wiki: 'Irish_Setter', group: 'Sporting' },
  { name: 'Weimaraner', scientific: 'Canis lupus familiaris', wiki: 'Weimaraner', group: 'Sporting' },
  { name: 'Vizsla', scientific: 'Canis lupus familiaris', wiki: 'Vizsla', group: 'Sporting' },
  { name: 'Brittany', scientific: 'Canis lupus familiaris', wiki: 'Brittany_(dog)', group: 'Sporting' },
  { name: 'German Shorthaired Pointer', scientific: 'Canis lupus familiaris', wiki: 'German_Shorthaired_Pointer', group: 'Sporting' },
  { name: 'English Springer Spaniel', scientific: 'Canis lupus familiaris', wiki: 'English_Springer_Spaniel', group: 'Sporting' },
  { name: 'Chesapeake Bay Retriever', scientific: 'Canis lupus familiaris', wiki: 'Chesapeake_Bay_Retriever', group: 'Sporting' },
  // Hound
  { name: 'Beagle', scientific: 'Canis lupus familiaris', wiki: 'Beagle', group: 'Hound' },
  { name: 'Basset Hound', scientific: 'Canis lupus familiaris', wiki: 'Basset_Hound', group: 'Hound' },
  { name: 'Bloodhound', scientific: 'Canis lupus familiaris', wiki: 'Bloodhound', group: 'Hound' },
  { name: 'Greyhound', scientific: 'Canis lupus familiaris', wiki: 'Greyhound', group: 'Hound' },
  { name: 'Afghan Hound', scientific: 'Canis lupus familiaris', wiki: 'Afghan_Hound', group: 'Hound' },
  { name: 'Borzoi', scientific: 'Canis lupus familiaris', wiki: 'Borzoi', group: 'Hound' },
  { name: 'Dachshund', scientific: 'Canis lupus familiaris', wiki: 'Dachshund', group: 'Hound' },
  { name: 'Rhodesian Ridgeback', scientific: 'Canis lupus familiaris', wiki: 'Rhodesian_Ridgeback', group: 'Hound' },
  { name: 'Whippet', scientific: 'Canis lupus familiaris', wiki: 'Whippet', group: 'Hound' },
  { name: 'Saluki', scientific: 'Canis lupus familiaris', wiki: 'Saluki', group: 'Hound' },
  { name: 'Irish Wolfhound', scientific: 'Canis lupus familiaris', wiki: 'Irish_Wolfhound', group: 'Hound' },
  // Working
  { name: 'Boxer', scientific: 'Canis lupus familiaris', wiki: 'Boxer_(dog)', group: 'Working' },
  { name: 'Great Dane', scientific: 'Canis lupus familiaris', wiki: 'Great_Dane', group: 'Working' },
  { name: 'Rottweiler', scientific: 'Canis lupus familiaris', wiki: 'Rottweiler', group: 'Working' },
  { name: 'Dobermann', scientific: 'Canis lupus familiaris', wiki: 'Dobermann', group: 'Working' },
  { name: 'Siberian Husky', scientific: 'Canis lupus familiaris', wiki: 'Siberian_Husky', group: 'Working' },
  { name: 'Alaskan Malamute', scientific: 'Canis lupus familiaris', wiki: 'Alaskan_Malamute', group: 'Working' },
  { name: 'Bernese Mountain Dog', scientific: 'Canis lupus familiaris', wiki: 'Bernese_Mountain_Dog', group: 'Working' },
  { name: 'Saint Bernard', scientific: 'Canis lupus familiaris', wiki: 'St._Bernard_(dog)', group: 'Working' },
  { name: 'Newfoundland', scientific: 'Canis lupus familiaris', wiki: 'Newfoundland_(dog)', group: 'Working' },
  { name: 'Akita', scientific: 'Canis lupus familiaris', wiki: 'Akita_(dog)', group: 'Working' },
  { name: 'Samoyed', scientific: 'Canis lupus familiaris', wiki: 'Samoyed_(dog)', group: 'Working' },
  { name: 'Bullmastiff', scientific: 'Canis lupus familiaris', wiki: 'Bullmastiff', group: 'Working' },
  // Terrier
  { name: 'Jack Russell Terrier', scientific: 'Canis lupus familiaris', wiki: 'Jack_Russell_Terrier', group: 'Terrier' },
  { name: 'Yorkshire Terrier', scientific: 'Canis lupus familiaris', wiki: 'Yorkshire_Terrier', group: 'Terrier' },
  { name: 'Bull Terrier', scientific: 'Canis lupus familiaris', wiki: 'Bull_Terrier', group: 'Terrier' },
  { name: 'West Highland White Terrier', scientific: 'Canis lupus familiaris', wiki: 'West_Highland_White_Terrier', group: 'Terrier' },
  { name: 'Scottish Terrier', scientific: 'Canis lupus familiaris', wiki: 'Scottish_Terrier', group: 'Terrier' },
  { name: 'Airedale Terrier', scientific: 'Canis lupus familiaris', wiki: 'Airedale_Terrier', group: 'Terrier' },
  { name: 'Cairn Terrier', scientific: 'Canis lupus familiaris', wiki: 'Cairn_Terrier', group: 'Terrier' },
  { name: 'Border Terrier', scientific: 'Canis lupus familiaris', wiki: 'Border_Terrier', group: 'Terrier' },
  { name: 'Staffordshire Bull Terrier', scientific: 'Canis lupus familiaris', wiki: 'Staffordshire_Bull_Terrier', group: 'Terrier' },
  // Toy
  { name: 'Chihuahua', scientific: 'Canis lupus familiaris', wiki: 'Chihuahua_(dog)', group: 'Toy' },
  { name: 'Pomeranian', scientific: 'Canis lupus familiaris', wiki: 'Pomeranian_(dog)', group: 'Toy' },
  { name: 'Shih Tzu', scientific: 'Canis lupus familiaris', wiki: 'Shih_Tzu', group: 'Toy' },
  { name: 'Cavalier King Charles Spaniel', scientific: 'Canis lupus familiaris', wiki: 'Cavalier_King_Charles_Spaniel', group: 'Toy' },
  { name: 'Maltese', scientific: 'Canis lupus familiaris', wiki: 'Maltese_(dog)', group: 'Toy' },
  { name: 'Pug', scientific: 'Canis lupus familiaris', wiki: 'Pug', group: 'Toy' },
  { name: 'Papillon', scientific: 'Canis lupus familiaris', wiki: 'Papillon_(dog)', group: 'Toy' },
  { name: 'Pekingese', scientific: 'Canis lupus familiaris', wiki: 'Pekingese', group: 'Toy' },
  { name: 'Italian Greyhound', scientific: 'Canis lupus familiaris', wiki: 'Italian_Greyhound', group: 'Toy' },
  { name: 'Havanese', scientific: 'Canis lupus familiaris', wiki: 'Havanese_(dog)', group: 'Toy' },
  // Non-Sporting
  { name: 'Bulldog', scientific: 'Canis lupus familiaris', wiki: 'Bulldog', group: 'Non-Sporting' },
  { name: 'Poodle', scientific: 'Canis lupus familiaris', wiki: 'Poodle', group: 'Non-Sporting' },
  { name: 'Dalmatian', scientific: 'Canis lupus familiaris', wiki: 'Dalmatian_(dog)', group: 'Non-Sporting' },
  { name: 'Chow Chow', scientific: 'Canis lupus familiaris', wiki: 'Chow_Chow', group: 'Non-Sporting' },
  { name: 'Shar Pei', scientific: 'Canis lupus familiaris', wiki: 'Shar_Pei', group: 'Non-Sporting' },
  { name: 'Bichon Frise', scientific: 'Canis lupus familiaris', wiki: 'Bichon_Frise', group: 'Non-Sporting' },
  { name: 'Keeshond', scientific: 'Canis lupus familiaris', wiki: 'Keeshond', group: 'Non-Sporting' },
  { name: 'Lhasa Apso', scientific: 'Canis lupus familiaris', wiki: 'Lhasa_Apso', group: 'Non-Sporting' },
  { name: 'Shiba Inu', scientific: 'Canis lupus familiaris', wiki: 'Shiba_Inu', group: 'Non-Sporting' },
  { name: 'French Bulldog', scientific: 'Canis lupus familiaris', wiki: 'French_Bulldog', group: 'Non-Sporting' },
  { name: 'Boston Terrier', scientific: 'Canis lupus familiaris', wiki: 'Boston_Terrier', group: 'Non-Sporting' },
  // Herding
  { name: 'German Shepherd', scientific: 'Canis lupus familiaris', wiki: 'German_Shepherd', group: 'Herding' },
  { name: 'Border Collie', scientific: 'Canis lupus familiaris', wiki: 'Border_Collie', group: 'Herding' },
  { name: 'Australian Shepherd', scientific: 'Canis lupus familiaris', wiki: 'Australian_Shepherd', group: 'Herding' },
  { name: 'Pembroke Welsh Corgi', scientific: 'Canis lupus familiaris', wiki: 'Pembroke_Welsh_Corgi', group: 'Herding' },
  { name: 'Cardigan Welsh Corgi', scientific: 'Canis lupus familiaris', wiki: 'Cardigan_Welsh_Corgi', group: 'Herding' },
  { name: 'Shetland Sheepdog', scientific: 'Canis lupus familiaris', wiki: 'Shetland_Sheepdog', group: 'Herding' },
  { name: 'Old English Sheepdog', scientific: 'Canis lupus familiaris', wiki: 'Old_English_Sheepdog', group: 'Herding' },
  { name: 'Belgian Shepherd', scientific: 'Canis lupus familiaris', wiki: 'Belgian_Shepherd', group: 'Herding' },
  { name: 'Rough Collie', scientific: 'Canis lupus familiaris', wiki: 'Rough_Collie', group: 'Herding' },
  { name: 'Australian Cattle Dog', scientific: 'Canis lupus familiaris', wiki: 'Australian_Cattle_Dog', group: 'Herding' },
];

const CATEGORIES = {
  foxes: { animals: FOXES, label: 'Foxes' },
  cats:  { animals: CATS,  label: 'Cats' },
  dogs:  { animals: DOGS,  label: 'Dogs' },
};

function slugify(name) {
  return name.toLowerCase()
    .replace(/['\u2019\u00fc]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const doRequest = (reqUrl, redirects) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      const parsed = new URL(reqUrl);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      };
      https.get(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : `https://${parsed.hostname}${res.headers.location}`;
          return doRequest(next, redirects + 1);
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
        res.on('error', reject);
      }).on('error', reject);
    };
    doRequest(url, 0);
  });
}

async function getWikipediaImageUrl(wikiTitle) {
  // Use imageinfo API for more reliable image URLs
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${wikiTitle}&prop=pageimages|images&format=json&pithumbsize=800&pilicense=any`;
  const res = await httpsGet(apiUrl);
  const bodyStr = res.body.toString();
  if (bodyStr.startsWith('<')) return null; // HTML error page
  const data = JSON.parse(bodyStr);
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];
  const page = pages[pageId];

  if (page.thumbnail && page.thumbnail.source) {
    return page.thumbnail.source;
  }

  // Fallback: get the first image from the page via imageinfo
  if (page.images && page.images.length > 0) {
    for (const img of page.images) {
      if (/\.(jpg|jpeg|png)$/i.test(img.title) && !/commons-logo|flag|icon|map/i.test(img.title)) {
        const fileTitle = encodeURIComponent(img.title);
        const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${fileTitle}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
        await sleep(300);
        const infoRes = await httpsGet(infoUrl);
        const infoStr = infoRes.body.toString();
        if (infoStr.startsWith('<')) continue;
        const infoData = JSON.parse(infoStr);
        const infoPages = infoData.query.pages;
        const infoPageId = Object.keys(infoPages)[0];
        const info = infoPages[infoPageId];
        if (info.imageinfo && info.imageinfo[0]) {
          return info.imageinfo[0].thumburl || info.imageinfo[0].url;
        }
      }
    }
  }

  return null;
}

async function getCommonsImageUrl(searchTerm) {
  const search = encodeURIComponent(searchTerm);
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${search}&srnamespace=6&srlimit=1&format=json`;
  const res = await httpsGet(apiUrl);
  const bodyStr = res.body.toString();
  if (bodyStr.startsWith('<')) return null;
  const data = JSON.parse(bodyStr);
  const results = data.query.search;
  if (!results || results.length === 0) return null;

  const fileTitle = encodeURIComponent(results[0].title);
  const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${fileTitle}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
  await sleep(300);
  const infoRes = await httpsGet(infoUrl);
  const infoStr = infoRes.body.toString();
  if (infoStr.startsWith('<')) return null;
  const infoData = JSON.parse(infoStr);
  const infoPages = infoData.query.pages;
  const infoPageId = Object.keys(infoPages)[0];
  const info = infoPages[infoPageId];
  if (info.imageinfo && info.imageinfo[0]) {
    return info.imageinfo[0].thumburl || info.imageinfo[0].url;
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url, filePath, retries) {
  retries = retries || 0;
  const res = await httpsGet(url);
  if (res.statusCode === 200) {
    const contentType = res.headers['content-type'] || '';
    if (contentType.includes('text/html')) return false;
    fs.writeFileSync(filePath, res.body);
    return true;
  }
  if (res.statusCode === 429 && retries < 3) {
    const retryAfter = parseInt(res.headers['retry-after'] || '5', 10);
    console.log(`    429 rate limited, waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return downloadImage(url, filePath, retries + 1);
  }
  return false;
}

async function processCategory(categoryKey) {
  const category = CATEGORIES[categoryKey];
  const imagesDir = path.join(__dirname, 'images', categoryKey);
  const dataFile = path.join(__dirname, 'data', categoryKey + '.json');

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log(`\n=== ${category.label} (${category.animals.length} entries) ===\n`);

  const dataEntries = [];
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const animal of category.animals) {
    const slug = slugify(animal.name);

    // Check for existing file with any supported extension
    let existingFile = null;
    for (const ext of ['.jpg', '.png', '.jpeg']) {
      if (fs.existsSync(path.join(imagesDir, slug + ext))) {
        existingFile = slug + ext;
        break;
      }
    }

    if (existingFile) {
      console.log(`  SKIP  ${animal.name} (already exists)`);
      skipped++;
      dataEntries.push({ name: animal.name, scientific: animal.scientific, file: existingFile, group: animal.group });
      continue;
    }

    const fileName = slug + '.jpg';
    const filePath = path.join(imagesDir, fileName);

    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Delay between requests to avoid rate limiting (Wikimedia CDN returns 429 if too fast)
        await sleep(attempt === 1 ? 2000 : 5000);

        let imageUrl = await getWikipediaImageUrl(animal.wiki);
        if (!imageUrl) {
          if (attempt === 1) console.log(`  INFO  ${animal.name} - no Wikipedia image, trying Commons...`);
          imageUrl = await getCommonsImageUrl(animal.name);
        }
        if (!imageUrl) {
          if (attempt >= 3) console.log(`  FAIL  ${animal.name} (no image found)`);
          continue;
        }

        const ok = await downloadImage(imageUrl, filePath);
        if (ok) {
          console.log(`  OK    ${animal.name} -> ${fileName}`);
          downloaded++;
          dataEntries.push({ name: animal.name, scientific: animal.scientific, file: fileName, group: animal.group });
          success = true;
          break;
        } else {
          if (attempt >= 3) console.log(`  FAIL  ${animal.name} (download failed)`);
        }
      } catch (err) {
        if (attempt >= 3) {
          console.log(`  FAIL  ${animal.name} (${err.message})`);
        } else {
          console.log(`  RETRY ${animal.name} (attempt ${attempt + 1})...`);
        }
      }
    }
    if (!success && !dataEntries.find(e => e.name === animal.name)) {
      failed++;
    }
  }

  fs.writeFileSync(dataFile, JSON.stringify(dataEntries, null, 2) + '\n');

  console.log(`\n${category.label}: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
  console.log(`${dataFile} written with ${dataEntries.length} entries`);

  return { downloaded, skipped, failed, total: dataEntries.length };
}

async function main() {
  // Parse --category flag
  const categoryArg = process.argv.find(a => a.startsWith('--category='));
  const selectedCategory = categoryArg ? categoryArg.split('=')[1] : null;

  if (selectedCategory && !CATEGORIES[selectedCategory]) {
    console.error(`Unknown category: ${selectedCategory}`);
    console.error(`Valid categories: ${Object.keys(CATEGORIES).join(', ')}`);
    process.exit(1);
  }

  const categoriesToProcess = selectedCategory
    ? [selectedCategory]
    : Object.keys(CATEGORIES);

  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const key of categoriesToProcess) {
    const result = await processCategory(key);
    totalDownloaded += result.downloaded;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
  }

  console.log('\n=== Summary ===');
  console.log(`Total: ${totalDownloaded} downloaded, ${totalSkipped} skipped, ${totalFailed} failed`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
