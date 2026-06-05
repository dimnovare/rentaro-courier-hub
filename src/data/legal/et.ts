/**
 * SOURCE: /api/public/legal — struktureeritud õigus- ja poliitikatekstid
 * lehtedele /rules, /privacy ja /terms.
 *
 * rentaro't haldab Rentaro OÜ, Eesti osaühing, mis rendib kulleritele
 * kuu kaupa kohaletoimetamise e-rattaid Eestis (Tallinn) ja Lätis (Riia).
 * Hinnad, 30-päevane miinimum ja tagatisraha (võrdne valitud paketi
 * 30-päevase hinnaga) kajastavad lukustatud äreegleid.
 *
 * Nurksulgudes märgised nagu `[registered address — to be provided]`
 * tähistavad ettevõttepõhiseid andmeid, mille asutaja peab enne käivitamist
 * täitma. Brändi tekstis kasutatakse väiketähtedega "rentaro"; juriidiline
 * isik on "Rentaro OÜ".
 */

import type { LegalDoc } from "./types";

/** Ühine "viimati uuendatud" kuupäev kõigi õigusdokumentide jaoks. */
const LAST_UPDATED = "30. mai 2026";

/* ============================================================
   Renditingimused — /rules
   ============================================================ */
export const rentalRules: LegalDoc = {
  title: "Renditingimused",
  updated: LAST_UPDATED,
  intro:
    "Need reeglid selgitavad, kuidas rentaro e-ratta rent praktikas toimib — kes saab rentida, 30-päevane miinimum ja paketitingimused, sinu tagatisraha, mis on hinna sees, kuidas ratast kasutada ja hooldada ning mis toimub hoolduse, kahjustuste, varguse ja tagastamise korral. Need on osa rendilepingust, mille sõlmid Rentaro OÜ-ga enne ratta kättesaamist. Kui miski siin on vastuolus sinu allkirjastatud rendilepinguga, kehtib allkirjastatud leping.",
  sections: [
    {
      heading: "Kes saab rentida",
      body: [
        "rentaro e-ratta rentimiseks pead olema vähemalt 18-aastane, omama kehtivat riiklikult väljastatud isikut tõendavat dokumenti ja läbima meie isikusamasuse kontrolli. Pead esitama täpse ja ajakohase teabe ning olema õiguslikult võimeline sõlmima rendilepingu Eestis või Lätis.",
        "Rent on isiklik sinule kui nimeliselt määratud rentijale. Sina vastutad ratta eest kogu aja, mil see on sinu hoole all. Sa ei tohi laenata, edasi rentida, üle anda ega võõrandada ratast, akut, laadijat, lukku ega lisavarustust kellelegi teisele ning ei tohi lubada kellelgi teisel sellega sõita, kui me ei ole seda sinuga kirjalikult kokku leppinud.",
        "Me võime broneeringust keelduda või aktiivse rendi peatada või lõpetada juhul, kui isikusamasust ei õnnestu kontrollida, kui esitatud teave osutub ebatäpseks, kui makset või tagatisraha ei õnnestu võtta või kui neid reegleid või rendilepingut ei järgita.",
      ],
    },
    {
      heading: "Renditähtaeg ja paketid",
      body: [
        "Minimaalne renditähtaeg on 30 päeva. Paketi valid broneerimisel: paindlik 30-päevane pakett, 6-kuune pakett või 12-kuune pakett. Pikematel pakettidel on madalam päevahind vastutasuks pikemale kohustusele.",
        "Hinda arvestatakse 30-päevase perioodi kaupa vastavalt valitud paketi päevahinnale: 5,90 € päevas 30-päevasel paketil (177 € 30 päeva eest), 4,90 € päevas 6-kuusel paketil (147 € 30 päeva eest) ja 3,90 € päevas 12-kuusel paketil (117 € 30 päeva eest). 6-kuune ja 12-kuune määr on korduv 30-päevane hind valitud kohustuse kestuse jooksul — see ei ole ühekordne makse kogu perioodi eest.",
        "Pärast esimest 30 päeva võid pikendada kuu kaupa, vahetada pikema paketi vastu või leppida kokku tagastamise. Rendi pikendamiseks, muutmiseks või lõpetamiseks teata meile ratta kättesaamisel kinnitatud kontaktkanalite kaudu aegsasti enne jooksva perioodi lõppu. Pikema kohustuse ennetähtaegne lõpetamine võib mõjutada tagatisraha ja rendilepingus sätestatud kokkulepitud ennetähtaegse lõpetamise tingimusi.",
      ],
    },
    {
      heading: "Tagatisraha",
      body: [
        "Enne ratta kättesaamist on nõutav tagastatav tagatisraha. Tagatisraha võrdub valitud paketi 30-päevase hinnaga: 177 € 30-päevasel paketil, 147 € 6-kuusel paketil ja 117 € 12-kuusel paketil. Täpne summa kinnitatakse broneerimise käigus enne maksmist.",
        "Tagatisraha tagab sinu kohustuste täitmist rendi raames. Me võime selle arvelt katta või sellest maha arvata summad, mida sa meile võlgned — näiteks tavalist kulumist ületavate kahjustuste, puuduva või kahjustatud varustuse (luku, laadija, aku või lisavarustuse), tasumata renditasude, puhastuse eest, kui ratas tagastatakse ülemäära määrdununa, või hilise või tagastamata jätmisega seotud tasude eest.",
        "Pärast ratta tagastamist ja ülevaatust ning kui kõik võlgnetavad summad on tasutud, tagastame ülejäänud tagatisraha kasutatud makseviisile, tavaliselt 14 päeva jooksul tagastamisest. Kui peame tagatisrahast maha arvama, selgitame enne tagastuse lõpuleviimist põhjust ja summat.",
      ],
    },
    {
      heading: "Mis on hinna sees",
      body: [
        "Iga pakett sisaldab e-ratast, akut, laadijat ja lukku koos tavapärase hooldustoega — pidurite ja käikude reguleerimine, rehvirikete käsitlemine, üldhooldus ja kulumisega seotud remont, mis ei ole põhjustatud väärkasutusest.",
        "Valikulisi lisatarvikuid, nagu lisaaku, kohaletoimetamise kott, telefonihoidik, kiiver, tugevdatud lukk või talverehvid, saab rendile lisada täiendava tasu eest ning need kinnitatakse broneerimisel. Iga lisavarustus on osa rendist ja tuleb tagastada koos rattaga.",
      ],
    },
    {
      heading: "Lubatud ja keelatud kasutus",
      body: [
        "rentaro e-rattad on ehitatud linnasiseseks kohaletoimetamiseks ja igapäevaseks linnasõiduks linnades, kus me tegutseme. Sõida ratta määratud koormus- ja sõitja kaalu piirides, hoia see liiklemiskõlblikus seisukorras ning kasuta seda ainult pindadel ja tingimustes, milleks see on mõeldud.",
        "Sa ei tohi: muuta, rikkuda ega üritada parandada ratast, akut, mootorit, kontrollerit, lukku ega elektroonikat; eemaldada ega kõrvaldada mis tahes jälgimis-, lukustus- või kiiruspiirangu seadet; kasutada ratast võiduajamiseks, trikitamiseks, maastikuks ettenägematuks kasutamiseks, pukseerimiseks või selliste reisijate vedamiseks, kelleks see ei ole ehitatud; rentida ratast edasi ega äriliselt edasi rentida; ega kasutada seda mis tahes ebaseaduslikul eesmärgil või alkoholi või narkootikumide mõju all.",
        "Sa ei tohi viia ratast väljapoole Eestit ja Lätit ega väljapoole mis tahes teeninduspiirkonda, millest me sulle teatame, ilma meie eelneva kirjaliku nõusolekuta.",
      ],
    },
    {
      heading: "Liiklusreeglid ja ohutu sõit",
      body: [
        "Sina vastutad seadusliku ja ohutu sõidu eest. Järgi Eestis või Lätis kehtivaid liiklus- ja kergliikuri reegleid, sealhulgas reegleid selle kohta, kus tohid sõita, kiiruse, eesõiguse ja jalakäijatele tee andmise kohta. Kasuta pimedas või halva nähtavuse korral tulesid ja näita teistele liiklejatele oma kavatsusi.",
        "Soovitame tungivalt kanda igal sõidul kiivrit; mõnes olukorras ja mõne sõitja jaoks on see seadusega nõutav. Ära kasuta sõidu ajal telefoni käes — kasuta telefonihoidikut. Sina vastutad kõigi trahvide, karistuste või tasude eest, mis tulenevad sellest, kuidas sa sõidad või kuhu sa ratta pargid või jätad.",
      ],
    },
    {
      heading: "Laadimine ja aku hooldus",
      body: [
        "Lae akut ainult meie poolt antud laadijaga ning järgi ratta kättesaamisel antud ohutu laadimise juhiseid. Lae kuivas, ventileeritavas siseruumis, eemal soojusallikatest ja kergsüttivatest materjalidest, ära jäta laadivat akut pikaks ajaks järelevalveta ning ära lae akut, mis on nähtavalt kahjustatud, paisunud või märg — võta selle asemel meiega ühendust.",
        "Hoia aku ja laadija kuivana ning kaitse neid löökide ja äärmuslike temperatuuride eest. Kui rendid pikemateks kohaletoimetamise päevadeks lisaaku, kohtle seda sama hoolikalt kui ratast. Sina vastutad aku ja laadija kaotsimineku või kahjustamise eest, kuni need on sinu hoole all.",
      ],
    },
    {
      heading: "Lukustamine ja turvalisus",
      body: [
        "Alati, kui ratas jääb järelevalveta, isegi korraks, lukusta see kaasasoleva lukuga kindla ja tugeva eseme külge ning kindlusta vastavalt ratta kättesaamisel antud juhistele. Ära kunagi jäta ratast lukustamata, ära kunagi jäta akut ega laadijat avalikus kohas järelevalveta ning ära jäta võtmeid ratta juurde.",
        "Ratta nõuetekohaselt lukustamata või kindlustamata jätmine võib panna sind vastutama sellest tuleneva kaotsimineku, varguse või kahju eest. Kui sinu mudeliga on kaasas täiendav turvavarustus, kasuta seda vastavalt juhistele.",
      ],
    },
    {
      heading: "Hooldus ja rikete teatamine",
      body: [
        "Hoia ratas mõistlikult puhas ja kontrolli enne iga vahetust, et pidurid, rehvid, tuled ja aku töötaksid. Teata meile igast rikkest, hoiatusest, ebatavalisest helist või kahjustusest niipea, kui seda märkad, ning lõpeta sõit, kui ratas on ohtlik.",
        "Tavapärane ja kulumisega seotud hooldus on hinna sees. Ära korralda kolmandate osapoolte remonti ega muudatusi ilma meiega eelnevalt ühendust võtmata — lubamatu remont võidakse sinult sisse nõuda. Kui ratas vajab pikemat remonti, püüame laoseisu võimaldades pakkuda asendusratta, et sinu vahetused jätkuksid, kuid asendusratast ei saa alati tagada.",
      ],
    },
    {
      heading: "Kahjustused, vargus ja õnnetused",
      body: [
        "Teata meile niipea kui võimalik — ja hiljemalt 24 tunni jooksul — igast ratta või selle varustusega seotud õnnetusest, kahjustusest, kaotsiminekust või vargusest. Varguse, vandalismi või liiklusõnnetuse korral pead sellest teatama ka politseile, hankima viitenumbri ja jagama seda meiega. Ära tunnista süüd ega lepi kolmandate osapooltega meie nimel kokku.",
        "Kui ratas varastatakse, ära lõpeta selle otsimist meie korraldusel, tagasta meile võti ja kogu allesjäänud varustus ning esita politsei viitenumber. Sina vastutad ratta eest, kuni see leitakse üles või asi on meiega lõpetatud.",
        "Sina vastutad tavalist kulumist ületavate kahjustuste, puuduva või kahjustatud varustuse ning kaotsimineku või varguse eest, mis tuleneb sellest, et sa ei lukustanud, kindlustanud ega hoolitsenud ratta eest nõutud viisil. Kui sa oled vastutav, võime nõuda remondi- või asenduskulu kuni ratta ja varustuse väärtuseni ning kohaldada selle katteks tagatisraha. Selgitame iga tasu enne selle võtmist.",
      ],
    },
    {
      heading: "Talvine ja hooajaline kasutus",
      body: [
        "rentaro rattaid saab sõita aastaringselt, kuid talvitingimused nõuavad lisahoolt. Vähenda kiirust, arvesta pikemate peatumisteekondadega ning ole eriti ettevaatlik jää, lume ja märgade lehtede korral. Külm ilm võib samuti vähendada aku kestust laadimiste vahel.",
        "Talverehvid on külmematel kuudel saadaval lisatarvikuna. Hoia aku ja laadija võimaluse korral soojas ja kuivas, sest väga madalad temperatuurid võivad mõjutada aku jõudlust ja laadimist.",
      ],
    },
    {
      heading: "Tagastamine ja üleandmine",
      body: [
        "Rendi lõpus tagasta ratas kokkulepitud ajal ja kohas koos kogu kaasasoleva varustusega — aku, laadija, lukk, võtmed ja kõik lisatarvikud — puhtas ja töökorras seisukorras, arvestades tavalist kulumist.",
        "Vaatame ratta üleandmisel üle ja märgime selle seisukorra. Kui kõik tasumata tasud on tasutud, vabastame ülejäänud tagatisraha ülalkirjeldatud viisil. Hilinenult tagastatud, puudulikult tagastatud või üldse tagastamata rataste eest võidakse rakendada täiendavaid päevatasusid, asenduskulusid ja mahaarvamisi tagatisrahast ning me võime käsitleda tagastamata ratast kaotsiminekuna ja nõuda sisse selle väärtuse.",
      ],
    },
  ],
};

/* ============================================================
   Tingimused — /terms
   ============================================================ */
export const termsOfService: LegalDoc = {
  title: "Tingimused",
  updated: LAST_UPDATED,
  intro:
    "Need tingimused reguleerivad rentaro veebisaidi kasutamist ja e-ratta rendi broneerimist. rentaro't haldab Rentaro OÜ. Tingimused kehtivad kõrvuti renditingimuste ja rendilepinguga, mille sa allkirjastad enne ratta kättesaamist; renti ennast reguleerib allkirjastatud rendileping. Palun loe need tingimused enne broneerimist hoolikalt läbi.",
  sections: [
    {
      heading: "Kes me oleme ja kuidas meiega ühendust võtta",
      body: [
        "rentaro teenust haldab Rentaro OÜ, Eestis registreeritud osaühing (registrikood [registration code — to be provided], registreeritud aadress [registered address — to be provided], käibemaksukohustuslase number [VAT number — to be provided, if registered]). Nendes tingimustes tähendavad \"rentaro\", \"me\", \"meie\" ja \"meid\" Rentaro OÜ-d ning \"sina\" tähendab klienti.",
        "Meiega saad ühendust e-posti teel aadressil info@rentaro.ee või telefoni teel numbril [support phone — to be provided]. Need tingimused on koostatud eesti keeles; rendileping ja mis tahes nõutav seadusjärgne teave esitatakse sulle enne kohustuse võtmist.",
      ],
    },
    {
      heading: "Nende tingimuste kohta",
      body: [
        "Kasutades rentaro veebisaiti või esitades broneeringu, nõustud nende tingimustega. Kui sa ei nõustu, palun ära kasuta veebisaiti ega broneeri renti.",
        "Me võime neid tingimusi aeg-ajalt uuendada, näiteks et kajastada muudatusi meie teenuses, hinnastruktuuris või seaduses. Veebisaidil avaldatud versioon kehtib selle kasutamisele ning sinu rendi kinnitamise ajal kehtivad tingimused kohalduvad sellele rendile. Anname mõistlikku etteteatamist olulistest muudatustest, mis mõjutavad aktiivset renti.",
      ],
    },
    {
      heading: "rentaro teenus",
      body: [
        "rentaro pakub kuist ja pikemaajalist e-rataste renti, mis on suunatud kohaletoimetamise kulleritele, koos lisatarvikute ja hooldustoega Eestis (Tallinn) ja Lätis (Riia). Meie rattad sobivad linnasiseseks kohaletoimetamiseks.",
        "rentaro on iseseisev renditeenus. Me ei ole ametlikult seotud, partnerluses ega heaks kiidetud Bolti, Wolti ega ühegi teise kohaletoimetamisplatvormi poolt. Iga viide kohaletoimetamisele kirjeldab, milleks rattad sobivad, ega tähenda partnerlust.",
      ],
    },
    {
      heading: "Broneeringud ja lepingu sõlmimine",
      body: [
        "Veebisaidi kaudu esitatud broneering on rendi taotlus; see ei loo iseenesest siduvat renti. Siduv rent tekib alles siis, kui me kinnitame sinu broneeringu, sa läbid isikusamasuse kontrolli, tasud esimese perioodi ja tagatisraha ning allkirjastad rendilepingu.",
        "Me võime broneeringust keelduda või selle tühistada enne, kui see muutub siduvaks — näiteks juhul, kui isikusamasust ei õnnestu kontrollida, kui sobiv ratas ei ole saadaval, kui makset või tagatisraha ei õnnestu võtta või kui neid tingimusi või renditingimusi ei täideta. Kui me tühistame enne rendi algust, tagastame kõik selle broneeringu eest tasutud summad.",
      ],
    },
    {
      heading: "Isikusamasuse kontroll ja allkirjastamine",
      body: [
        "Enne rendi algust kontrollime sinu isikusamasust ja palume sul allkirjastada rendilepingu. Isikut tõendavad dokumendid ja kõik nõutavad isikuandmed kogutakse ja töödeldakse turvaliselt, nagu on kirjeldatud meie privaatsuspoliitikas.",
        "Rendileping allkirjastatakse elektrooniliselt meie e-allkirjastamise teenusepakkuja Dokobit kaudu. Rent ei saa alata ja ratast ei anta üle enne, kui kontroll on lõpetatud ja leping allkirjastatud.",
      ],
    },
    {
      heading: "Tasud, arveldus ja maksmine",
      body: [
        "Hinda arvestatakse 30-päevase perioodi kaupa vastavalt valitud paketi päevahinnale, mis arvutatakse päevahinna korrutamisel 30-ga: 5,90 €/päevas = 177 € 30 päeva eest (30-päevane pakett), 4,90 €/päevas = 147 € 30 päeva eest (6-kuune pakett) ja 3,90 €/päevas = 117 € 30 päeva eest (12-kuune pakett). Minimaalne renditähtaeg on 30 päeva. Hinnad sisaldavad käibemaksu, kui see on kohaldatav.",
        "Esimene 30-päevane periood ja tagatisraha võetakse enne ratta kättesaamist. Iga järgnev 30-päevane periood võetakse ette selle perioodi alguses sinu paketi kestuse jooksul. Valikulised lisatarvikud võetakse vastavalt broneerimisel kinnitatule.",
        "Makseid ja tagatisraha töötleb meie makseteenuse pakkuja Montonio. Sa volitad meid võtma sinu valitud makseviisilt paketi alusel tasumisele kuuluvad summad, sealhulgas pikendused, lisatarvikud ja kõik tasud kahjustuste, puuduva varustuse või hilise või tagastamata jätmise eest, nagu on sätestatud renditingimustes. Kui makse ebaõnnestub, võime rendi peatada, kuni see on lahendatud. Hinnad võivad muutuda tulevaste broneeringute või pikenduste osas pärast sinu kohustusperioodi, mõistliku etteteatamisega.",
      ],
    },
    {
      heading: "Tagatisraha ja sinu vastutus",
      body: [
        "Enne ratta kättesaamist võetakse tagastatav tagatisraha, mis võrdub sinu paketi 30-päevase hinnaga (177 €, 147 € või 117 €) ja mida käsitletakse nagu on kirjeldatud renditingimustes. Me võime selle arvelt katta summad, mida sa võlgned, ja tagastada jäägi pärast ratta tagastamist ja ülevaatust.",
        "Sina vastutad ratta ja varustuse eest, kuni need on sinu hoole all. Kui sa oled vastutav tavalist kulumist ületavate kahjustuste, puuduva varustuse või kaotsimineku või varguse eest, mis on põhjustatud sellest, et sa ei kindlustanud ratast, võib sinu vastutus ületada tagatisraha kuni ratta ja varustuse remondi- või asendusväärtuseni. Me ei vastuta sinu saamata jäänud tulu ega muude kaudsete kahjude eest, mis tulenevad ratta kättesaamatusest, välja arvatud juhul, kui seadus seda välistada ei luba.",
      ],
    },
    {
      heading: "Üleandmine, kättesaamine ja sinu kohustused",
      body: [
        "Lepime sinuga kokku ratta kättesaamise või kohaletoimetamise aja ja koha. Sa pead olema kättesaadav, kaasa võtma kehtiva isikut tõendava dokumendi ja lõpetama üleandmise. Üleandmisel kinnitad ratta seisukorra ja saad kätte varustuse, mis on osa sinu rendist.",
        "Kogu rendi vältel nõustud esitama täpset teavet, hoidma oma kontakt- ja makseandmed ajakohased, sõitma seaduslikult, hoolitsema ratta ja varustuse eest ning järgima renditingimusi — sealhulgas laadimist, lukustamist, hooldust, rikete teatamist ning kahjustuste, varguse ja õnnetuste menetlust.",
      ],
    },
    {
      heading: "Meie teenus ja tugi",
      body: [
        "Pakume veebisaiti ja renditeenust mõistliku oskuse ja hoolega. Tavapärane ja kulumisega seotud hooldus on igas paketis ja me püüame hoida sinu ratta sõidukorras ning pakkuda asendusratast, kui remont võtab kauem, laoseisu võimaldades.",
        "Meil võib olla vaja teostada rendi ajal hooldust, tagasikutsumisi või ohutuskontrolle ning lepime need sinuga kokku. Me ei garanteeri veebisaidi katkematut kättesaadavust ega seda, et konkreetne ratas, mudel või lisatarvik on alati saadaval.",
      ],
    },
    {
      heading: "Peatamine ja lõpetamine",
      body: [
        "Me võime rendi peatada või lõpetada, etteteatamisega võimaluse korral, kui sa rikud neid tingimusi, renditingimusi või rendilepingut; kui makset või tagatisraha ei õnnestu võtta; kui isikusamasust või teavet ei õnnestu kontrollida; kui ratast kasutatakse ebaseaduslikult või ohtlikult; või kui seadus seda nõuab. Lõpetamisel pead ratta ja kogu varustuse viivitamatult tagastama.",
        "Sa võid rendi lõpetada vastavalt oma paketile ja renditingimustele — paindlikul paketil 30-päevase miinimumi lõpus või pikema kohustuse korral kokkulepitud viisil. Kohustusliku paketi ennetähtaegne lõpetamine võib hõlmata rendilepingus sätestatud ennetähtaegse lõpetamise tingimusi.",
      ],
    },
    {
      heading: "Tühistamine ja taganemisõigus",
      body: [
        "Kui oled ELi tarbija, on sul üldjuhul õigus taganeda sidevahendi abil sõlmitud lepingust 14 päeva jooksul selle sõlmimisest, põhjust esitamata. Taganemiseks teata meile selgelt selle aja jooksul ülaltoodud kontaktandmete kaudu; sa ei pea kasutama kindlat vormi.",
        "Kuna rent on teenus, võid paluda meil seda alustada 14-päevase taganemisperioodi jooksul. Kui palud meil alustada (näiteks võttes ratta) ja seejärel taganed, pead tasuma proportsionaalse summa juba osutatud teenuse osa eest kuni hetkeni, mil sa meile taganemisest teatad. Kui teenus on 14 päeva jooksul täielikult osutatud sinu sõnaselge eelneva nõusoleku ja sinu kinnitusega, et kaotad taganemisõiguse, kui teenus on täielikult osutatud, siis taganemisõigust enam ei kohaldata.",
        "Miski selles jaotises ei piira tühistamis- ja tagastamisõigusi, mida on kirjeldatud jaotises Broneeringud ja lepingu sõlmimine, ega ühtegi õigust, mis sul on Eesti või ELi tarbijaõiguse alusel.",
      ],
    },
    {
      heading: "Kindlustus",
      body: [
        "Kui me ei teata sulle sõnaselgelt kirjalikult, et sinu rendiga on kaasas konkreetne kindlustuskaitse, ei tohiks sa eeldada, et ratas, sina kui sõitja või kolmandad osapooled on rentaro kaudu kindlustusega kaetud. Iga kaasasolev kindlustuskaitse kirjeldatakse sinu rendilepingus koos sellega, mida see katab, ja kohaldatava omavastutusega.",
        "Soovitame kaaluda enda sobivat kindlustust kohaletoimetamistöö ja isikukahju jaoks. Sina vastutad jätkuvalt ratta ja varustuse eest ning sinu sõidust tulenevate kolmandate osapoolte nõuete eest, nagu on sätestatud renditingimustes ja rendilepingus.",
      ],
    },
    {
      heading: "Vastutuse piiramine",
      body: [
        "Pakume veebisaiti ja teenust mõistliku hoolega, kuid seaduses lubatud ulatuses ei vastuta me kaudse, juhusliku või kaasneva kahju ega saamata jäänud kasumi, tulu või sissetuleku eest, mis tuleneb veebisaidist, rendist, seisakuajast või ratta, mudeli või lisatarviku kättesaamatusest.",
        "Miski nendes tingimustes ei välista ega piira meie vastutust seal, kus see oleks ebaseaduslik — sealhulgas vastutust meie hooletusest põhjustatud surma või isikukahju eest, pettuse eest või mis tahes tarbijaõiguste eest, mida ei saa välistada. Üksikasjalikud vastutustingimused rendi enda kohta on sätestatud renditingimustes ja rendilepingus.",
      ],
    },
    {
      heading: "Vääramatu jõud",
      body: [
        "Me ei vastuta oma kohustuste täitmata jätmise ega täitmisega viivitamise eest, kui see on põhjustatud meie mõistliku kontrolli alt väljas olevatest sündmustest — sealhulgas äärmuslikust ilmast, loodusõnnetustest, tulekahjust, üleujutusest, epideemiast või pandeemiast, streikidest, kommunaalteenuste, transpordi- või sidevõrkude tõrkest, meie kontrolli alt väljas olevast vargusest või vandalismist või valitsuse või ametiasutuste tegevusest.",
        "Kui selline sündmus mõjutab sinu renti, anname sulle teada ja töötame koos sinuga õiglase lahenduse nimel, mis võib hõlmata ümberplaneerimist, võimaluse korral asendusratta pakkumist või mõjutatud perioodi kohandamist.",
      ],
    },
    {
      heading: "Kaebused ja vaidluste lahendamine",
      body: [
        "Kui midagi läheb valesti, palun võta esmalt meiega ühendust ülaltoodud andmete kaudu, et saaksime proovida olukorda parandada. Püüame kaebusi kiiresti kinnitada ja õiglaselt lahendada.",
        "Kui me ei suuda vaidlust lahendada, võid sina kui tarbija pöörduda sellega tarbijavaidluste komisjoni poole, mis tegutseb Tarbijakaitse ja Tehnilise Järelevalve Ameti juures, Endla 10a, 10122 Tallinn. Samuti võid kasutada Euroopa Komisjoni veebipõhise vaidluste lahendamise platvormi aadressil ec.europa.eu/odr. Need teed on lisaks sinu õigusele pöörduda kohtusse.",
      ],
    },
    {
      heading: "Kohaldatav õigus ja kohtualluvus",
      body: [
        "Neid tingimusi ja iga veebisaidi kaudu broneeritud renti reguleerib Eesti õigus. Kui oled tarbija, kasud sa ka kõigist oma elukohariigi õiguse kohustuslikest kaitsetest ning miski siin ei kõrvalda neid kaitseid.",
        "Vaidlused alluvad Eesti kohtutele, välja arvatud juhul, kui kohustuslik tarbijaõigus annab sulle õiguse algatada menetlus oma elukohajärgsetes kohtutes. Kui mõni nende tingimuste osa osutub jõustamatuks, jäävad ülejäänud osad kehtima.",
      ],
    },
  ],
};

/* ============================================================
   Küpsiste poliitika — lisatud privaatsuspoliitikasse ja eksporditud
   eraldi taaskasutamiseks (nt tulevane /cookies leht).
   ============================================================ */
export const cookiePolicy: LegalDoc = {
  title: "Küpsiste poliitika",
  updated: LAST_UPDATED,
  intro:
    "See küpsiste poliitika selgitab, milliseid küpsiseid ja sarnaseid tehnoloogiaid rentaro veebisait kasutab, mida need teevad ja kui kaua need kestavad. See on osa meie privaatsuspoliitikast. Valikulisi küpsiseid kontrollid sinu esimesel külastusel kuvatava nõusolekuribaga ning võid oma valikut igal ajal muuta.",
  sections: [
    {
      heading: "Kuidas me küpsiseid kasutame",
      body: [
        "Küpsis on väike tekstifail, mille sinu brauser salvestab sinu seadmesse. Kasutame väikest arvu küpsiseid, et sait töötaks, et meelde jätta sinu valikud ja — ainult sinu nõusolekul — et mõista, kuidas saiti kasutatakse, et saaksime seda parandada.",
        "Rühmitame küpsised rangelt vajalikeks või funktsionaalseteks küpsisteks, mis on alati sees, sest sait vajab neid, ning analüütikaküpsisteks, mis laaditakse alles pärast seda, kui sa need aktsepteerid. Me ei kasuta reklaami- ega saitidevahelisi jälgimisküpsiseid.",
      ],
    },
    {
      heading: "Funktsionaalsed küpsised",
      body: [
        "NEXT_LOCALE — jätab meelde sinu valitud keele, et sait kuvataks järgmisel külastusel sinu valitud keeles. Funktsionaalne; säilitatakse kuni 12 kuud.",
        "rentaro_consent — salvestab sinu küpsisevaliku (\"antud\" või \"keeldutud\"), et me ei küsiks igal külastusel uuesti ja et analüütika jääks välja, kui sa ei ole nõustunud. Rangelt vajalik nõusoleku haldamiseks; säilitatakse kuni 12 kuud.",
      ],
    },
    {
      heading: "Analüütikaküpsised (nõusolekupõhised)",
      body: [
        "Google Analytics — aitab meil mõista koondatud, anonümiseeritud veebisaidi kasutust, näiteks milliseid lehti külastatakse ja kuidas külastajad broneerimisvoos liiguvad. Seab Google ainult pärast seda, kui sa analüütikaga nõustud; küpsised kestavad tavaliselt sessiooni lõpust kuni umbes 24 kuud.",
        "PostHog — pakub privaatsusteadlikku tooteanalüütikat selle kohta, kuidas saiti ja broneerimisvoogu kasutatakse, majutatud ELis. Seatakse ainult pärast seda, kui sa analüütikaga nõustud; küpsised kestavad tavaliselt kuni umbes 12 kuud.",
        "Kui sa keeldud või valid ainult vajalikud, neid analüütikatööriistu ei laadita ja nende küpsiseid ei seata.",
      ],
    },
    {
      heading: "Oma valikute haldamine",
      body: [
        "Kui sa esimest korda külastad, võimaldab nõusolekuriba sul aktsepteerida analüütikat, keelduda või lubada ainult vajalikud küpsised. Sinu valik salvestatakse küpsisesse rentaro_consent ning analüütika laaditakse ainult siis, kui sa nõustud.",
        "Võid igal ajal meelt muuta, tühjendades brauseris küpsise rentaro_consent, mis paneb riba uuesti ilmuma, ja kohandades brauseris küpsiste seadeid. Rangelt vajalike või funktsionaalsete küpsiste blokeerimine võib mõjutada saidi tööd, näiteks sinu keele meeldejätmist.",
      ],
    },
  ],
};

/* ============================================================
   Privaatsuspoliitika — /privacy
   ============================================================ */
export const privacyPolicy: LegalDoc = {
  title: "Privaatsuspoliitika",
  updated: LAST_UPDATED,
  intro:
    "See poliitika selgitab, milliseid isikuandmeid rentaro kogub, miks ja millisel õiguslikul alusel me neid kasutame, kellega me neid jagame, kui kaua me neid säilitame ja millised on sinu õigused ELi isikuandmete kaitse üldmääruse (GDPR) alusel. rentaro't haldab Rentaro OÜ, kes on sinu isikuandmete vastutav töötleja. See sisaldab ka meie küpsiste poliitikat.",
  sections: [
    {
      heading: "Kes me oleme (vastutav töötleja)",
      body: [
        "rentaro't haldab Rentaro OÜ, Eestis registreeritud osaühing, kes on sinu isikuandmete eest vastutav töötleja. Registreeritud aadress: [registered address — to be provided]. Registrikood: [registration code — to be provided].",
        "Mis tahes privaatsusküsimuse korral või oma õiguste teostamiseks võta meiega ühendust aadressil [DPO / privacy contact — to be provided]. Me ei ole määranud seadusjärgset andmekaitseametnikku seal, kus see ei ole õiguslikult nõutav; kui see muutub, seda kontakti uuendatakse.",
      ],
    },
    {
      heading: "Andmed, mida me kogume",
      body: [
        "Broneeringu- ja kontaktandmed: sinu ees- ja perekonnanimi, e-posti aadress, telefoninumber, linn ja eelistatud alguskuupäev ning kõik märkused, mille sa meile saadad.",
        "Isikusamasuse ja lepingu andmed: rendilepingu sõlmimiseks kogume isikut tõendava dokumendi andmeid ja sinu isikukoodi või sünnikuupäeva. Need kogutakse ja töödeldakse turvaliselt, neid kasutatakse ainult kontrolliks ja lepinguks ning neid ei säilitata meie veebisaidi esiosas.",
        "Rendi-, makse- ja tagatisraha andmed: sinu valitud pakett ja lisatarvikud, sulle määratud ratas, arveldus- ja tagatisrahakirjed ning maksekinnitused. Kaardiandmed sisestatakse meie makseteenuse pakkuja juures ja neid hoiab tema; me ei säilita täielikke kaardinumbreid.",
        "Allkirjastamine ja suhtlus: rendilepingu ja selle allkirjastamise andmed ning e-kirjad ja sõnumid, mida me sinuga sinu broneeringu ja rendi kohta vahetame.",
        "Tehnilised ja kasutusandmed: seadme, brauseri ja sarnane teave ning — ainult seal, kus sa oled nõustunud — analüütika selle kohta, kuidas sa veebisaiti kasutad. Vaata allolevat küpsiste poliitikat.",
      ],
    },
    {
      heading: "Miks me sinu andmeid kasutame ja meie õiguslikud alused",
      body: [
        "Et võtta vastu ja hallata sinu broneeringut, kontrollida sinu isikusamasust, koostada ja allkirjastada rendileping, anda üle ja hallata sinu renti ning pakkuda teenuse- ja hooldustuge — õiguslik alus: sinuga sõlmitud lepingu täitmine (ja sinu taotlusel astutud sammud enne selle sõlmimist).",
        "Et võtta makseid ja tagatisraha, hallata pikendusi ja nõuda sisse summad, mida võlgnetakse kahjustuste, puuduva varustuse või hilise või tagastamata jätmise eest — õiguslik alus: lepingu täitmine ja meie õigustatud huvi saada tasu ning kaitsta oma vara.",
        "Et täita juriidilisi kohustusi, nagu raamatupidamine, maksud ja tarbijaõiguse alusel arvepidamine, ning vastata seaduslikele taotlustele — õiguslik alus: juriidilise kohustuse täitmine.",
        "Et hoida meie teenus ja veebisait turvalisena, ennetada pettust ja väärkasutust, käsitleda kaebusi ja kaitsta õigusnõudeid — õiguslik alus: meie õigustatud huvid teenuse haldamisel ja kaitsmisel. Kui me tugineme õigustatud huvidele, kaalume neid sinu õiguste vastu.",
        "Et mõista ja parandada, kuidas veebisaiti ja broneerimisvoogu kasutatakse, analüütika kaudu — õiguslik alus: sinu nõusolek, mille võid igal ajal tagasi võtta, ilma et see mõjutaks sinu renti.",
      ],
    },
    {
      heading: "Kellega me sinu andmeid jagame (volitatud töötlejad)",
      body: [
        "Kasutame usaldusväärseid teenusepakkujaid, kes töötlevad isikuandmeid meie nimel volitatud töötlejatena, andmetöötluslepingute alusel ja ainult meie juhiste järgi. Me ei müü sinu isikuandmeid.",
        "Resend — saadab tehingulisi ja teenusega seotud e-kirju sinu broneeringu ja rendi kohta.",
        "Montonio — töötleb makseid ja tagatisraha.",
        "Dokobit — käsitleb rendilepingu isikusamasusega toetatud elektroonilist allkirjastamist.",
        "Vercel — majutab ja teenindab rentaro veebisaiti.",
        "Railway — majutab meie rakenduse taustasüsteemi ja andmebaasi ELis.",
        "Google Analytics ja PostHog — pakuvad veebisaidi ja toote analüütikat ning töötavad ainult seal, kus sa oled nõustunud; PostHog on majutatud ELis.",
        "Me võime andmeid avaldada ka seal, kus seadus seda nõuab, et kaitsta oma õigusi või turvalisust, või seoses ettevõtte müügi või ümberkorraldamisega, mille puhul need jäävad selle poliitika alusel kaitstuks.",
      ],
    },
    {
      heading: "Rahvusvahelised edastused",
      body: [
        "Püüame hoida isikuandmeid Euroopa Majanduspiirkonna (EMP) sees. Meie majutus (Vercel, Railway) ja ELis majutatud analüütika (PostHog) on seadistatud hoidma andmeid võimaluse korral ELis/EMPs.",
        "Mõned teenusepakkujad, näiteks Google Analytics, võivad töödelda piiratud andmeid väljaspool EMPd. Kui see juhtub, tugineme asjakohastele kaitsemeetmetele — nagu Euroopa Komisjoni tüüptingimused või kaitse piisavuse otsus — et sinu andmed jääksid ELi standardite kohaselt kaitstuks.",
      ],
    },
    {
      heading: "Kui kaua me sinu andmeid säilitame",
      body: [
        "Säilitame isikuandmeid ainult nii kaua, kui ülaltoodud eesmärkide jaoks vaja, seejärel kustutame või anonümiseerime need.",
        "Broneeringu- ja rendikirjeid ning raamatupidamis- ja maksukirjeid säilitatakse Eesti seadusega nõutud perioodide jooksul (raamatupidamiskirjeid säilitatakse üldjuhul seitse aastat).",
        "Isikusamasuse kontrolli dokumente ja sinu isikukoodi säilitatakse ainult nii kaua, kui vaja rendilepingu sõlmimiseks ja toetamiseks ning juriidiliste kohustuste täitmiseks, ja seejärel kustutatakse. Analüütikaandmeid säilitatakse piiratud aja jooksul vastavalt tööriistade seadetele ning nõusolekukirjeid hoitakse nii kaua, kui vaja sinu valiku tõendamiseks. Turundus- või valikuliste sõnumite nõusolekuid hoitakse, kuni sa need tagasi võtad.",
      ],
    },
    {
      heading: "Sinu õigused",
      body: [
        "GDPRi alusel on sul õigus pääseda ligi oma isikuandmetele; lasta parandada ebatäpsed andmed; lasta andmed kustutada; piirata teatud töötlemist või sellele vastu olla; andmete ülekantavusele; ja seal, kus me tugineme nõusolekule, see igal ajal tagasi võtta, ilma et see mõjutaks juba teostatud töötlemist.",
        "Mis tahes nende õiguste teostamiseks võta meiega ühendust ülaltoodud andmete kaudu. Vastame seadusega määratud tähtaegade jooksul. Sul on samuti õigus esitada kaebus järelevalveasutusele — Eestis Andmekaitse Inspektsioonile — või selle ELi riigi asutusele, kus sa elad või töötad.",
      ],
    },
    {
      heading: "Automatiseeritud otsuste tegemine",
      body: [
        "Me ei tee sinu kohta otsuseid üksnes automatiseeritud töötlusel, mis toovad kaasa õiguslikke või sarnaselt olulisi tagajärgi. Isikusamasuse kontroll ja rendi heakskiitmine hõlmavad inimese ülevaatust.",
      ],
    },
    /* Küpsiste poliitika on lisatud privaatsuspoliitikasse, et nõusolekuriba
       ja jalus (mis mõlemad lingivad /privacy lehele) selleni jõuaksid.
       Ülaltoodud cookiePolicy eksport taaskasutab sama sisu tulevase
       /cookies lehe jaoks. */
    ...cookiePolicy.sections,
  ],
};
