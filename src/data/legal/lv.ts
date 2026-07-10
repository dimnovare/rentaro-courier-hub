/**
 * SOURCE: /api/public/legal — strukturēts juridiskais/politikas saturs
 * lapām /rules, /privacy un /terms.
 *
 * rentaro pakalpojumu sniedz Valguse Kodu OÜ, Igaunijas privāta sabiedrība ar
 * ierobežotu atbildību, kas izīrē piegādes elektrovelosipēdus pa mēnesim
 * kurjeriem Igaunijā (Tallinn) un Latvijā (Riga). Cenas, 30 dienu minimālais
 * periods un drošības nauda (vienāda ar izvēlētā plāna 30 dienu cenu)
 * atspoguļo fiksētos uzņēmējdarbības noteikumus.
 *
 * Uzņēmuma specifiskās detaļas (reģistrācijas kods, reģistrētā adrese, PVN
 * numurs, atbalsta e-pasts un tālrunis) ir ņemtas no parakstītā līguma
 * veidnes. Zīmola tekstā lieto mazo burtu "rentaro"; darbojošā juridiskā
 * persona ir "Valguse Kodu OÜ", kas pārvalda Rentaro zīmolu.
 */

import type { LegalDoc } from "./types";

/** Kopīgs "pēdējoreiz atjaunināts" datums katram juridiskajam dokumentam. */
const LAST_UPDATED = "2026. gada 30. maijs";

/* ============================================================
   Īres noteikumi — /rules
   ============================================================ */
export const rentalRules: LegalDoc = {
  title: "Īres noteikumi",
  updated: LAST_UPDATED,
  intro:
    "Šie noteikumi izskaidro, kā praktiski darbojas rentaro elektrovelosipēda īre — kas drīkst īrēt, 30 dienu minimums un plānu nosacījumi, jūsu drošības nauda, kas ir iekļauts, kā lietot un kopt velosipēdu, kā arī kas notiek ar apkopi, bojājumiem, zādzību un atgriešanu. Tie ir daļa no īres līguma, ko parakstāt ar Valguse Kodu OÜ pirms saņemšanas. Ja kaut kas šeit ir pretrunā ar jūsu parakstīto īres līgumu, piemērojams ir parakstītais līgums.",
  sections: [
    {
      heading: "Kas drīkst īrēt",
      body: [
        "Lai īrētu rentaro elektrovelosipēdu, jums jābūt vismaz 18 gadus vecam, jābūt derīgam valsts izsniegtam personu apliecinošam dokumentam un jāpabeidz mūsu identitātes pārbaude. Jums jāsniedz precīza, aktuāla informācija un jābūt juridiski spējīgam slēgt īres līgumu Igaunijā vai Latvijā.",
        "Īre ir personiska un attiecas uz jums, nosaukto īrnieku. Jūs esat atbildīgs par velosipēdu visu laiku, kamēr tas atrodas jūsu pārziņā. Jūs nedrīkstat aizdot, apakšīrēt, nodot vai pārvietot velosipēdu, akumulatoru, lādētāju vai izvēlētos piederumus nevienam citam, un jūs nedrīkstat ļaut nevienam citam to vadīt, ja vien neesam to ar jums rakstiski saskaņojuši.",
        "Mēs varam noraidīt rezervāciju vai apturēt vai izbeigt aktīvu īri, ja identitāti nevar pārbaudīt, ja sniegtā informācija izrādās neprecīza, ja maksājumu vai drošības naudu nevar saņemt vai ja šie noteikumi vai īres līgums netiek ievēroti.",
      ],
    },
    {
      heading: "Īres termiņš un plāni",
      body: [
        "Minimālais īres periods ir 30 dienas. Rezervējot izvēlaties savu plānu: elastīgu 30 dienu plānu, 6 mēnešu plānu vai 12 mēnešu plānu. Garākiem plāniem ir zemāka dienas likme apmaiņā pret ilgāku saistību periodu.",
        "Cena tiek aprēķināta par katru 30 dienu periodu pēc izvēlētā plāna dienas likmes: €5,90 dienā 30 dienu plānā (€177 par 30 dienām), €4,90 dienā 6 mēnešu plānā (€147 par 30 dienām) un €3,90 dienā 12 mēnešu plānā (€117 par 30 dienām). 6 mēnešu un 12 mēnešu likmes ir atkārtota 30 dienu cena par visu jūsu izvēlēto saistību periodu — tās nav vienreizējs maksājums par visu periodu.",
        "Maksājumi notiek pa 30 dienu periodiem. Pirmais maksājums — jāveic pēc apstiprināšanas, kad esat pieņēmis īres līgumu — sedz pirmās 30 dienas, izvēlētos papildu piederumus un, ja izvēlējāties piegādi, vienreizēju piegādes maksu; atmaksājamā drošības nauda tiek iekasēta kopā ar to. Pirms katra nākamā 30 dienu perioda mēs nosūtām rēķinu par šo periodu (velosipēds plus jūsu piederumi), kas apmaksājams ar bankas pārskaitījumu. Piegādes maksa nekad netiek iekasēta atkārtoti.",
        "Pēc pirmajām 30 dienām varat pagarināt no mēneša uz mēnesi, pāriet uz garāku plānu vai organizēt atgriešanu. Lai pagarinātu, mainītu vai izbeigtu īri, paziņojiet mums pa saziņas kanāliem, kas apstiprināti saņemšanas brīdī, savlaicīgi pirms jūsu pašreizējā perioda beigām. Garāku saistību izbeigšana priekšlaicīgi var ietekmēt drošības naudu un jebkurus saskaņotos priekšlaicīgas izbeigšanas nosacījumus, kas noteikti jūsu īres līgumā.",
      ],
    },
    {
      heading: "Drošības nauda",
      body: [
        "Pirms saņemšanas ir nepieciešama atmaksājama drošības nauda. Drošības nauda ir vienāda ar izvēlētā plāna 30 dienu cenu: €177 30 dienu plānā, €147 6 mēnešu plānā un €117 12 mēnešu plānā. Precīza summa tiek apstiprināta rezervēšanas laikā pirms maksājuma veikšanas.",
        "Drošības nauda nodrošina jūsu saistību izpildi saskaņā ar īri. Mēs varam to ieskaitīt vai no tās atskaitīt summas, ko esat mums parādā — piemēram, bojājumus, kas pārsniedz parasto nolietojumu, trūkstošu vai bojātu aprīkojumu (lādētājs, akumulators vai izvēlētie piederumi, tostarp rentaro slēdzene, ja tā izvēlēta), nesamaksātas īres maksas, tīrīšanu, ja velosipēds tiek atgriezts pārmērīgi netīrs, vai maksas, kas rodas no novēlotas vai neatgriešanas.",
        "Pēc velosipēda atgriešanas un pārbaudes un kad jebkuras parādsummas ir nokārtotas, mēs atmaksājam atlikušo drošības naudu izmantotajā maksāšanas veidā, parasti 14 dienu laikā pēc atgriešanas. Ja mums no drošības naudas jāatskaita, mēs paskaidrosim iemeslu un summu pirms atmaksas pabeigšanas.",
      ],
    },
    {
      heading: "Kas ir iekļauts",
      body: [
        "Katrs plāns ietver elektrovelosipēdu, akumulatoru un lādētāju kopā ar regulāru servisa atbalstu — bremžu un pārnesumu regulēšanu, riepu caurumu novēršanu, vispārēju apkopi un ar nolietojumu saistītus remontus, kas nav radušies nepareizas lietošanas dēļ.",
        "Papildu piederumus, piemēram, papildu akumulatoru, piegādes somu, telefona turētāju, ķiveri, izturīgu slēdzeni vai ziemas riepas, var pievienot jūsu īrei par papildu maksu, un tie tiek apstiprināti rezervēšanas laikā. Jebkurš papildu aprīkojums ir daļa no īres un jāatgriež kopā ar velosipēdu.",
      ],
    },
    {
      heading: "Atļautā un aizliegtā lietošana",
      body: [
        "rentaro elektrovelosipēdi ir veidoti pilsētas piegādes maiņām un ikdienas pilsētas braukšanai pilsētās, kurās darbojamies. Brauciet velosipēda noteikto kravas un braucēja svara ierobežojumu robežās, uzturiet to braukšanai derīgā stāvoklī un lietojiet to tikai uz virsmām un apstākļos, kuriem tas ir paredzēts.",
        "Jūs nedrīkstat: pārveidot, manipulēt ar vai mēģināt remontēt velosipēdu, akumulatoru, motoru, kontrolieri, slēdzeni vai elektroniku; noņemt vai atspējot jebkādu izsekošanas, slēgšanas vai ātruma ierobežošanas aprīkojumu; izmantot velosipēdu sacīkstēm, trikiem, bezceļa ļaunprātīgai izmantošanai, vilkšanai vai pasažieru pārvadāšanai, kuriem tas nav paredzēts; apakšīrēt vai komerciāli pārīrēt velosipēdu; vai izmantot to jebkādam nelikumīgam mērķim vai alkohola vai narkotiku ietekmē.",
        "Jūs nedrīkstat izvest velosipēdu ārpus Igaunijas un Latvijas vai ārpus jebkura servisa apgabala, par kuru mēs jums paziņojam, bez mūsu iepriekšējas rakstiskas piekrišanas.",
      ],
    },
    {
      heading: "Ceļu satiksmes noteikumi un droša braukšana",
      body: [
        "Jūs esat atbildīgs par likumīgu un drošu braukšanu. Ievērojiet ceļu satiksmes un vieglo elektrisko transportlīdzekļu noteikumus, kas piemērojami Igaunijā vai Latvijā, tostarp noteikumus par to, kur drīkstat braukt, ātrumu, priekšroku un priekšrokas došanu gājējiem. Lietojiet gaismas tumsā vai sliktas redzamības apstākļos un signalizējiet par saviem nodomiem citiem ceļu satiksmes dalībniekiem.",
        "Mēs stingri iesakām katrā braucienā valkāt ķiveri; dažās situācijās un dažiem braucējiem tas ir noteikts ar likumu. Braucot nelietojiet telefonu rokā — izmantojiet telefona turētāju. Jūs esat atbildīgs par jebkurām sodanaudām, sankcijām vai maksām, kas rodas no tā, kā braucat vai kur novietojat vai atstājat velosipēdu.",
      ],
    },
    {
      heading: "Uzlāde un akumulatora kopšana",
      body: [
        "Lādējiet akumulatoru tikai ar mūsu nodrošināto lādētāju un ievērojiet drošas uzlādes norādījumus, kas sniegti saņemšanas brīdī. Lādējiet sausā, vēdināmā iekštelpā prom no siltuma avotiem un uzliesmojošiem materiāliem, neatstājiet lādējošu akumulatoru bez uzraudzības ilgu laiku un nelādējiet akumulatoru, kas ir redzami bojāts, uzpūties vai slapjš — tā vietā sazinieties ar mums.",
        "Uzturiet akumulatoru un lādētāju sausu un sargājiet tos no triecieniem un ārkārtējām temperatūrām. Ja īrējat papildu akumulatoru garākām piegādes dienām, izturieties pret to ar tādu pašu rūpību kā pret velosipēdu. Jūs esat atbildīgs par akumulatora un lādētāja nozaudēšanu vai bojājumiem, kamēr tie atrodas jūsu pārziņā.",
      ],
    },
    {
      heading: "Slēgšana un drošība",
      body: [
        "Kad vien velosipēds tiek atstāts bez uzraudzības, pat īsu brīdi, pieslēdziet to pie nostiprināta, izturīga objekta ar piemērotu slēdzeni vai rentaro slēdzeni, ja to izvēlējāties. Nostipriniet to, kā norādīts saņemšanas brīdī. Nekad neatstājiet velosipēdu neslēgtu, nekad neatstājiet akumulatoru vai lādētāju bez uzraudzības publiskā vietā un neatstājiet atslēgas pie velosipēda.",
        "Velosipēda nepareiza slēgšana vai nenostiprināšana var padarīt jūs atbildīgu par nozaudēšanas, zādzības vai bojājumu izmaksām, kas no tā izriet. Ja izvēlējāties papildu drošības aprīkojumu, izmantojiet to, kā norādīts.",
      ],
    },
    {
      heading: "Apkope un kļūmju ziņošana",
      body: [
        "Uzturiet velosipēdu saprātīgi tīru un pirms katras maiņas pārbaudiet, vai darbojas bremzes, riepas, gaismas un akumulators. Ziņojiet mums par jebkuru kļūmi, brīdinājumu, neparastu troksni vai bojājumu, tiklīdz to pamanāt, un pārtrauciet braukšanu, ja velosipēds nav drošs.",
        "Regulārā un ar nolietojumu saistītā apkope ir iekļauta. Neorganizējiet trešo pušu remontus vai pārveidojumus, vispirms nesazinoties ar mums — par neatļautiem remontiem jums var tikt izrakstīts rēķins. Ja velosipēdam nepieciešams ilgāks remonts, mēs cenšamies nodrošināt aizvietotāju, kamēr to atļauj krājumi, lai jūsu maiņas turpinātos, taču aizvietotāju nevar garantēt visos gadījumos.",
      ],
    },
    {
      heading: "Bojājumi, zādzība un negadījumi",
      body: [
        "Paziņojiet mums pēc iespējas ātrāk — un ne vēlāk kā 24 stundu laikā — par jebkuru negadījumu, bojājumu, nozaudēšanu vai zādzību, kas saistīta ar velosipēdu vai tā aprīkojumu. Zādzības, vandālisma vai ceļu satiksmes negadījuma gadījumā jums tas arī jāziņo policijai, jāiegūst atsauces numurs un jāpaziņo mums. Neatzīstiet vainu un nenoslēdziet vienošanos ar trešajām personām mūsu vārdā.",
        "Ja velosipēds tiek nozagts, nepārtrauciet to meklēt pēc mūsu norādījuma, atgrieziet mums atslēgu un jebkuru atlikušo aprīkojumu un sniedziet policijas atsauci. Jūs paliekat atbildīgs par velosipēdu, līdz tas tiek atgūts vai lieta ar mums tiek slēgta.",
        "Jūs esat atbildīgs par bojājumiem, kas pārsniedz parasto nolietojumu, par trūkstošu vai bojātu aprīkojumu un par nozaudēšanu vai zādzību, kas izriet no tā, ka neesat noslēdzis, nostiprinājis vai kopis velosipēdu, kā prasīts. Ja esat atbildīgs, mēs varam piemērot remonta vai nomaiņas izmaksas līdz velosipēda un aprīkojuma vērtībai un varam tās ieskaitīt no drošības naudas. Mēs paskaidrosim jebkuru maksu pirms tās piemērošanas.",
      ],
    },
    {
      heading: "Ziemas un sezonāla lietošana",
      body: [
        "rentaro velosipēdus var izmantot visu gadu, taču ziemas apstākļos nepieciešama papildu uzmanība. Samaziniet ātrumu, atvēliet garāku bremzēšanas ceļu un esiet īpaši uzmanīgs uz ledus, sniega un slapjām lapām. Auksts laiks var arī samazināt, cik ilgi akumulators darbojas starp uzlādēm.",
        "Ziemas riepas ir pieejamas kā piederums aukstākiem mēnešiem. Ja iespējams, uzturiet akumulatoru un lādētāju siltu un sausu, jo ļoti zemas temperatūras var ietekmēt akumulatora veiktspēju un uzlādi.",
      ],
    },
    {
      heading: "Atgriešana un nodošana",
      body: [
        "Īres beigās atgrieziet velosipēdu saskaņotajā laikā un vietā ar visu nodrošināto aprīkojumu — akumulatoru, lādētāju, atslēgām un izvēlētajiem piederumiem, tostarp rentaro slēdzeni, ja tā izvēlēta — tīrā, darba kārtībā esošā stāvoklī, ņemot vērā parasto nolietojumu.",
        "Mēs pārbaudām velosipēdu nodošanas brīdī un fiksējam tā stāvokli. Kad jebkuras nesamaksātās maksas ir nokārtotas, mēs atbrīvojam atlikušo drošības naudu, kā aprakstīts iepriekš. Par velosipēdiem, kas atgriezti novēloti, atgriezti nepilnīgi vai vispār netiek atgriezti, var tikt piemērotas papildu dienas maksas, nomaiņas izmaksas un atskaitījumi no drošības naudas, un mēs varam uzskatīt neatgrieztu velosipēdu par zaudējumu un atgūt tā vērtību.",
      ],
    },
  ],
};

/* ============================================================
   Noteikumi un nosacījumi — /terms
   ============================================================ */
export const termsOfService: LegalDoc = {
  title: "Noteikumi un nosacījumi",
  updated: LAST_UPDATED,
  intro:
    "Šie noteikumi regulē jūsu rentaro tīmekļa vietnes lietošanu un jūsu elektrovelosipēda īres rezervāciju. rentaro pakalpojumu sniedz Valguse Kodu OÜ. Šie noteikumi pastāv līdzās īres noteikumiem un īres līgumam, ko parakstāt pirms saņemšanas; parakstītais īres līgums regulē pašu īri. Lūdzu, rūpīgi izlasiet šos noteikumus pirms rezervēšanas.",
  sections: [
    {
      heading: "Kas mēs esam un kā ar mums sazināties",
      body: [
        "rentaro pakalpojumu sniedz Valguse Kodu OÜ (darbojas ar zīmolu Rentaro), privāta sabiedrība ar ierobežotu atbildību, kas reģistrēta Igaunijā (reģistrācijas kods 14621591, reģistrētā adrese Narva mnt 128-4, Tallinn 10127, Igaunija, PVN numurs EE102246089). Šajos noteikumos \"rentaro\", \"mēs\", \"mūs\" un \"mūsu\" nozīmē Valguse Kodu OÜ (darbojas ar zīmolu Rentaro), un \"jūs\" nozīmē klientu.",
        "Ar mums varat sazināties pa e-pastu info@rentaro.ee vai pa tālruni +372 5649 7933. Šie noteikumi ir rakstīti angļu valodā; īres līgums un jebkura nepieciešamā likumā noteiktā informācija jums tiek sniegta pirms saistību uzņemšanās.",
      ],
    },
    {
      heading: "Par šiem noteikumiem",
      body: [
        "Izmantojot rentaro tīmekļa vietni vai iesniedzot rezervāciju, jūs piekrītat šiem noteikumiem. Ja nepiekrītat, lūdzu, neizmantojiet tīmekļa vietni un nerezervējiet īri.",
        "Mēs laiku pa laikam varam atjaunināt šos noteikumus, piemēram, lai atspoguļotu izmaiņas mūsu pakalpojumā, cenu struktūrā vai likumdošanā. Tīmekļa vietnē publicētā versija attiecas uz tās izmantošanu, un noteikumi, kas ir spēkā jūsu īres apstiprināšanas brīdī, attiecas uz šo īri. Mēs sniegsim saprātīgu paziņojumu par būtiskām izmaiņām, kas ietekmē aktīvu īri.",
      ],
    },
    {
      heading: "rentaro pakalpojums",
      body: [
        "rentaro piedāvā ikmēneša un ilgāka termiņa elektrovelosipēdu īri, kas paredzēta piegādes kurjeriem, kopā ar piederumiem un servisa atbalstu Igaunijā (Tallinn) un Latvijā (Riga). Mūsu velosipēdi ir piemēroti pilsētas piegādes darbam.",
        "rentaro ir neatkarīgs īres pakalpojums. Mēs neesam oficiāli saistīti ar, partnerattiecībās ar vai apstiprināti no Bolt, Wolt vai jebkuras citas piegādes platformas. Jebkura piegādes darba pieminēšana apraksta, kam velosipēdi ir piemēroti, un nenozīmē partnerattiecības.",
      ],
    },
    {
      heading: "Rezervācijas un līguma noslēgšana",
      body: [
        "Rezervācija, kas iesniegta caur tīmekļa vietni, ir pieprasījums īrēt; tā pati par sevi nerada saistošu īri. Saistoša īre tiek izveidota tikai tad, kad mēs apstiprinām jūsu rezervāciju, jūs pabeidzat identitātes pārbaudi, jūs samaksājat pirmo periodu un drošības naudu un jūs parakstāt īres līgumu.",
        "Mēs varam noraidīt vai atcelt rezervāciju pirms tā kļūst saistoša — piemēram, ja identitāti nevar pārbaudīt, ja nav pieejams piemērots velosipēds, ja maksājumu vai drošības naudu nevar saņemt vai ja šie noteikumi vai īres noteikumi netiek izpildīti. Ja mēs atceļam pirms īres sākuma, mēs atmaksājam jebkuras summas, ko esat samaksājis par šo rezervāciju.",
      ],
    },
    {
      heading: "Identitātes pārbaude un parakstīšana",
      body: [
        "Pirms īres sākuma mēs pārbaudām jūsu identitāti un lūdzam jums parakstīt īres līgumu. Personu apliecinošie dokumenti un jebkuri nepieciešamie personas dati tiek vākti un apstrādāti droši, kā aprakstīts mūsu privātuma politikā.",
        "Īres līgums tiek parakstīts klātienē saņemšanas brīdī vai — ja nosūtām līgumu jums iepriekš — jūs varat to parakstīt pats un atgriezt parakstīto kopiju caur savu īres portālu, uz papīra vai digitāli (piemēram, ar DigiDoc / Smart-ID). Īre nevar sākties, un velosipēds netiks nodots, kamēr nav pabeigta pārbaude un parakstīts līgums.",
      ],
    },
    {
      heading: "Maksas, rēķini un maksājumi",
      body: [
        "Cena tiek aprēķināta par katru 30 dienu periodu pēc izvēlētā plāna dienas likmes, ko aprēķina kā dienas likmi, reizinātu ar 30: €5,90/dienā = €177 par 30 dienām (30 dienu plāns), €4,90/dienā = €147 par 30 dienām (6 mēnešu plāns) un €3,90/dienā = €117 par 30 dienām (12 mēnešu plāns). Minimālais īres periods ir 30 dienas. Cenas ietver PVN, kur tas piemērojams.",
        "Pirmais maksājums jāveic pēc rezervācijas apstiprināšanas un īres līguma pieņemšanas. Tas sedz pirmo 30 dienu periodu, izvēlētos papildu piederumus un — ja izvēlējāties piegādi bezmaksas saņemšanas vietā — vienreizēju piegādes maksu; atmaksājamā drošības nauda tiek iekasēta kopā ar to. Par katru nākamo jūsu plāna 30 dienu periodu mēs izrakstām rēķinu pirms perioda sākuma — par velosipēdu un jūsu papildu piederumiem šim periodam —, kas apmaksājams ar bankas pārskaitījumu. Piegādes maksa tiek iekasēta tikai vienu reizi un nekad nav daļa no atkārtotās 30 dienu cenas.",
        "Maksājumi tiek veikti ar bankas pārskaitījumu uz rēķinā norādīto kontu vai skaidrā naudā, ja tas saskaņots nodošanas brīdī. Maksas par bojājumiem, trūkstošu aprīkojumu vai novēlotu vai neatgriešanu tiek izrakstītas rēķinā, kā noteikts īres noteikumos. Ja maksājums netiek veikts laikā, mēs varam apturēt īri, līdz tas tiek atrisināts. Cenas var mainīties turpmākajām rezervācijām vai atjaunojumiem pēc jūsu saistību perioda, ar saprātīgu paziņojumu.",
      ],
    },
    {
      heading: "Drošības nauda un jūsu atbildība",
      body: [
        "Atmaksājama drošības nauda, kas vienāda ar jūsu plāna 30 dienu cenu (€177, €147 vai €117), tiek iekasēta pirms saņemšanas un apstrādāta, kā aprakstīts īres noteikumos. Mēs varam to ieskaitīt summās, ko esat parādā, un atmaksāt atlikumu pēc velosipēda atgriešanas un pārbaudes.",
        "Jūs esat atbildīgs par velosipēdu un aprīkojumu, kamēr tie atrodas jūsu pārziņā. Ja esat atbildīgs par bojājumiem, kas pārsniedz parasto nolietojumu, trūkstošu aprīkojumu vai nozaudēšanu vai zādzību, ko izraisījusi jūsu velosipēda nenostiprināšana, jūsu atbildība var pārsniegt drošības naudu līdz velosipēda un aprīkojuma remonta vai nomaiņas vērtībai. Mēs neesam atbildīgi par jūsu peļņas zaudējumu vai citiem netiešiem zaudējumiem, kas rodas no velosipēda nepieejamības, izņemot gadījumus, kad likums neļauj to izslēgt.",
      ],
    },
    {
      heading: "Piegāde, saņemšana un jūsu pienākumi",
      body: [
        "Mēs ar jums saskaņosim saņemšanas vai piegādes laiku un vietu. Jums jābūt pieejamam, jāņem līdzi derīgs personu apliecinošs dokuments un jāpabeidz nodošana. Nodošanas brīdī jūs apstiprināt velosipēda stāvokli un saņemat aprīkojumu, kas ir daļa no jūsu īres.",
        "Visas īres laikā jūs piekrītat sniegt precīzu informāciju, uzturēt savus kontaktinformācijas un maksājumu datus aktuālus, braukt likumīgi, kopt velosipēdu un aprīkojumu un ievērot īres noteikumus — tostarp uzlādi, slēgšanu, apkopi, kļūmju ziņošanu un bojājumu, zādzības un negadījumu procedūru.",
      ],
    },
    {
      heading: "Mūsu pakalpojums un atbalsts",
      body: [
        "Mēs nodrošinām tīmekļa vietni un īres pakalpojumu ar saprātīgu prasmi un rūpību. Regulārā un ar nolietojumu saistītā apkope ir iekļauta katrā plānā, un mēs cenšamies uzturēt jūsu velosipēdu uz ceļa un piedāvāt aizvietotāju, ja remonts aizņem ilgāku laiku, kamēr to atļauj krājumi.",
        "Īres laikā mums var būt nepieciešams veikt apkopi, atsaukumus vai drošības pārbaudes, un mēs tās ar jums saskaņosim. Mēs negarantējam tīmekļa vietnes nepārtrauktu pieejamību vai to, ka konkrēts velosipēds, modelis vai piederums vienmēr būs pieejams.",
      ],
    },
    {
      heading: "Apturēšana un izbeigšana",
      body: [
        "Mēs varam apturēt vai izbeigt īri, ar paziņojumu, ja tas ir saprātīgi iespējams, ja jūs pārkāpjat šos noteikumus, īres noteikumus vai īres līgumu; ja maksājumu vai drošības naudu nevar saņemt; ja identitāti vai informāciju nevar pārbaudīt; ja velosipēds tiek lietots nelikumīgi vai nedroši; vai ja to prasa likums. Pēc izbeigšanas jums nekavējoties jāatgriež velosipēds un viss aprīkojums.",
        "Jūs varat izbeigt savu īri saskaņā ar savu plānu un īres noteikumiem — 30 dienu minimuma beigās elastīgajā plānā vai kā saskaņots garākām saistībām. Saistību plāna priekšlaicīga izbeigšana var ietvert priekšlaicīgas izbeigšanas nosacījumus, kas noteikti jūsu īres līgumā.",
      ],
    },
    {
      heading: "Atcelšana un atteikuma tiesības",
      body: [
        "Ja esat patērētājs ES, jums parasti ir tiesības atteikties no distances līguma 14 dienu laikā pēc tā noslēgšanas, nenorādot iemeslu. Lai atteiktos, skaidri paziņojiet mums šajā periodā, izmantojot iepriekš norādīto kontaktinformāciju; jums nav jāizmanto noteikta veidlapa.",
        "Tā kā īre ir pakalpojums, jūs varat lūgt mums to uzsākt 14 dienu atteikuma perioda laikā. Ja jūs lūdzat mums uzsākt (piemēram, paņemot velosipēdu) un pēc tam atsakāties, jums jāmaksā proporcionāla summa par jau sniegto pakalpojuma daļu līdz brīdim, kad paziņojat mums par atteikšanos. Ja pakalpojums tiek pilnībā izpildīts 14 dienu laikā ar jūsu skaidru iepriekšēju piekrišanu un jūsu apliecinājumu, ka jūs zaudējat atteikuma tiesības, tiklīdz tas ir pilnībā izpildīts, atteikuma tiesības vairs nav piemērojamas.",
        "Nekas šajā sadaļā neierobežo atcelšanas un atmaksas tiesības, kas aprakstītas sadaļā Rezervācijas un līguma noslēgšana, vai jebkuras tiesības, kas jums ir saskaņā ar Igaunijas vai ES patērētāju tiesību aktiem.",
      ],
    },
    {
      heading: "Apdrošināšana",
      body: [
        "Ja vien mēs jums skaidri rakstiski nepaziņojam, ka konkrēta apdrošināšanas segšana ir iekļauta jūsu īrē, jums nevajadzētu pieņemt, ka velosipēds, jūs kā braucējs vai trešās personas ir apdrošinātas caur rentaro. Jebkura iekļautā apdrošināšanas segšana tiks aprakstīta jūsu īres līgumā, kopā ar to, ko tā sedz, un jebkuru piemērojamo pašrisku.",
        "Mēs iesakām apsvērt savu piemērotu apdrošināšanu piegādes darbam un miesas bojājumiem. Jūs paliekat atbildīgs par velosipēdu un aprīkojumu un par trešo pušu prasībām, kas rodas no jūsu braukšanas, kā noteikts īres noteikumos un īres līgumā.",
      ],
    },
    {
      heading: "Atbildības ierobežojums",
      body: [
        "Mēs nodrošinām tīmekļa vietni un pakalpojumu ar saprātīgu rūpību, taču likumā atļautajā apjomā mēs neesam atbildīgi par netiešiem, nejaušiem vai izrietošiem zaudējumiem vai par peļņas, ienākumu vai izpeļņas zaudējumu, kas rodas no tīmekļa vietnes, īres, dīkstāves vai velosipēda, modeļa vai piederuma nepieejamības.",
        "Nekas šajos noteikumos neizslēdz un neierobežo mūsu atbildību, ja to darīt būtu nelikumīgi — tostarp atbildību par nāvi vai miesas bojājumiem, ko izraisījusi mūsu nolaidība, par krāpšanu vai par jebkurām tiesībām, kas jums ir kā patērētājam un kuras nevar izslēgt. Detalizēti atbildības nosacījumi pašai īrei ir noteikti īres noteikumos un īres līgumā.",
      ],
    },
    {
      heading: "Nepārvarama vara",
      body: [
        "Mēs neesam atbildīgi par savu pienākumu neizpildi vai aizkavēšanos to izpildē, ja to izraisa notikumi ārpus mūsu saprātīgas kontroles — tostarp ekstrēmi laikapstākļi, dabas katastrofas, ugunsgrēks, plūdi, epidēmija vai pandēmija, streiki, komunālo pakalpojumu, transporta vai sakaru tīklu darbības traucējumi, zādzība vai vandālisms ārpus mūsu kontroles vai valdības vai valsts iestāžu rīcība.",
        "Ja šāds notikums ietekmē jūsu īri, mēs jums to paziņosim un strādāsim ar jums pie godīga risinājuma, kas var ietvert pārplānošanu, aizvietotāja nodrošināšanu, kur tas iespējams, vai ietekmētā perioda pielāgošanu.",
      ],
    },
    {
      heading: "Sūdzības un strīdu risināšana",
      body: [
        "Ja kaut kas noiet greizi, lūdzu, vispirms sazinieties ar mums, izmantojot iepriekš norādīto informāciju, lai mēs varētu mēģināt to labot. Mēs cenšamies nekavējoties apstiprināt sūdzības un atrisināt tās godīgi.",
        "Ja mēs nevaram atrisināt strīdu, jūs kā patērētājs varat to nodot Patērētāju strīdu komisijai (Tarbijavaidluste komisjon), kas darbojas Igaunijas Patērētāju aizsardzības un tehniskās uzraudzības iestādē (Tarbijakaitse ja Tehnilise Järelevalve Amet), Endla 10a, 10122 Tallinn. Jūs varat arī izmantot Eiropas Komisijas strīdu izšķiršanas tiešsaistes platformu ec.europa.eu/odr. Šie ceļi papildina jūsu tiesības vērsties tiesā.",
      ],
    },
    {
      heading: "Piemērojamie tiesību akti un jurisdikcija",
      body: [
        "Šos noteikumus un jebkuru īri, kas rezervēta caur tīmekļa vietni, regulē Igaunijas tiesību akti. Ja esat patērētājs, jūs gūstat labumu arī no jebkurām obligātajām aizsardzībām, ko paredz tās valsts tiesību akti, kurā dzīvojat, un nekas šeit nenoņem šīs aizsardzības.",
        "Strīdi ir pakļauti Igaunijas tiesām, ja vien obligātie patērētāju tiesību akti nedod jums tiesības celt prasību tās valsts tiesās, kurā dzīvojat. Ja kāda šo noteikumu daļa tiek atzīta par neizpildāmu, atlikušās daļas turpina būt piemērojamas.",
      ],
    },
  ],
};

/* ============================================================
   Sīkdatņu politika — iegult privātuma politikā un eksportēt
   atsevišķi atkārtotai izmantošanai (piem., nākotnes /cookies lapai).
   ============================================================ */
export const cookiePolicy: LegalDoc = {
  title: "Sīkdatņu politika",
  updated: LAST_UPDATED,
  intro:
    "Šī sīkdatņu politika izskaidro sīkdatnes un līdzīgas tehnoloģijas, ko rentaro tīmekļa vietne izmanto, ko tās dara un cik ilgi tās saglabājas. Tā ir daļa no mūsu privātuma politikas. Jūs kontrolējat neobligātās sīkdatnes ar piekrišanas baneri, kas tiek parādīts jūsu pirmajā apmeklējumā, un jūs varat mainīt savu izvēli jebkurā laikā.",
  sections: [
    {
      heading: "Kā mēs izmantojam sīkdatnes",
      body: [
        "Sīkdatne ir mazs teksta fails, ko jūsu pārlūkprogramma saglabā jūsu ierīcē. Mēs izmantojam nelielu skaitu sīkdatņu, lai vietne darbotos, lai atcerētos jūsu izvēli un — tikai ar jūsu piekrišanu — lai saprastu, kā vietne tiek izmantota, lai mēs to varētu uzlabot.",
        "Mēs grupējam sīkdatnes kā stingri nepieciešamās vai funkcionālās sīkdatnes, kuras vienmēr ir ieslēgtas, jo vietnei tās ir nepieciešamas, un analītikas sīkdatnes, kuras tiek ielādētas tikai pēc tam, kad tās pieņemat. Mēs neizmantojam reklāmas vai starpvietņu izsekošanas sīkdatnes.",
      ],
    },
    {
      heading: "Funkcionālās sīkdatnes",
      body: [
        "NEXT_LOCALE — atceras valodu, ko izvēlējāties, lai vietne nākamajā apmeklējumā tiktu rādīta jūsu izvēlētajā valodā. Funkcionāla; saglabāta līdz 12 mēnešiem.",
        "rentaro_consent — reģistrē jūsu sīkdatņu izvēli (\"granted\" vai \"denied\"), lai mēs neprasītu atkārtoti katrā apmeklējumā un lai analītika paliktu izslēgta, ja vien neesat piekritis. Stingri nepieciešama piekrišanas pārvaldībai; saglabāta līdz 12 mēnešiem.",
      ],
    },
    {
      heading: "Analītikas sīkdatnes (uz piekrišanas balstītas)",
      body: [
        "Google Analytics — palīdz mums saprast apkopotu, anonimizētu tīmekļa vietnes lietošanu, piemēram, kuras lapas tiek apmeklētas un kā apmeklētāji pārvietojas pa rezervēšanas plūsmu. Iestata Google tikai pēc tam, kad pieņemat analītiku; sīkdatnes parasti saglabājas no jūsu sesijas beigām līdz aptuveni 24 mēnešiem.",
        "PostHog — nodrošina uz privātumu vērstu produkta analītiku par to, kā tiek izmantota vietne un rezervēšanas plūsma, mitināta ES. Iestata tikai pēc tam, kad pieņemat analītiku; sīkdatnes parasti saglabājas līdz aptuveni 12 mēnešiem.",
        "Ja atsakāties vai izvēlaties tikai nepieciešamās, šie analītikas rīki netiek ielādēti un to sīkdatnes netiek iestatītas.",
      ],
    },
    {
      heading: "Jūsu izvēles pārvaldība",
      body: [
        "Kad pirmoreiz apmeklējat vietni, piekrišanas baneris ļauj pieņemt analītiku, atteikties vai atļaut tikai nepieciešamās sīkdatnes. Jūsu izvēle tiek saglabāta rentaro_consent sīkdatnē, un analītika tiek ielādēta tikai tad, ja piekrītat.",
        "Jūs varat pārdomāt jebkurā laikā, izdzēšot rentaro_consent sīkdatni savā pārlūkprogrammā, kas liek banerim parādīties atkārtoti, un pielāgojot sīkdatņu iestatījumus savā pārlūkprogrammā. Stingri nepieciešamo vai funkcionālo sīkdatņu bloķēšana var ietekmēt vietnes darbību, piemēram, jūsu valodas atcerēšanos.",
      ],
    },
  ],
};

/* ============================================================
   Privātuma politika — /privacy
   ============================================================ */
export const privacyPolicy: LegalDoc = {
  title: "Privātuma politika",
  updated: LAST_UPDATED,
  intro:
    "Šī politika izskaidro, kādus personas datus rentaro vāc, kāpēc un uz kāda juridiskā pamata mēs tos izmantojam, ar ko mēs tos kopīgojam, cik ilgi mēs tos glabājam un kādas tiesības jums ir saskaņā ar ES Vispārīgo datu aizsardzības regulu (VDAR). rentaro pakalpojumu sniedz Valguse Kodu OÜ, kas ir jūsu personas datu pārzinis. Tā ietver arī mūsu sīkdatņu politiku.",
  sections: [
    {
      heading: "Kas mēs esam (datu pārzinis)",
      body: [
        "rentaro pakalpojumu sniedz Valguse Kodu OÜ (darbojas ar zīmolu Rentaro), privāta sabiedrība ar ierobežotu atbildību, kas reģistrēta Igaunijā un ir pārzinis, kurš atbildīgs par jūsu personas datiem. Reģistrētā adrese: Narva mnt 128-4, Tallinn 10127, Igaunija. Reģistrācijas kods: 14621591.",
        "Jebkuram privātuma jautājumam vai lai īstenotu savas tiesības, sazinieties ar mums info@rentaro.ee. Mēs neesam iecēluši likumā noteiktu datu aizsardzības speciālistu, ja tas nav juridiski nepieciešams; ja tas mainās, šī kontaktinformācija tiks atjaunināta.",
      ],
    },
    {
      heading: "Dati, ko mēs vācam",
      body: [
        "Rezervēšanas un kontaktinformācija: jūsu vārds un uzvārds, e-pasta adrese, tālruņa numurs, pilsēta un vēlamais sākuma datums, kā arī jebkuras piezīmes, ko mums nosūtāt.",
        "Identitātes un līguma dati: lai noslēgtu īres līgumu, mēs vācam personu apliecinošā dokumenta informāciju un jūsu personas identifikācijas kodu vai dzimšanas datumu. Tie tiek vākti un apstrādāti droši, tiek izmantoti tikai pārbaudei un līgumam un netiek glabāti mūsu tīmekļa vietnes priekšpusē.",
        "Īres, maksājumu un drošības naudas dati: plāns un piederumi, ko izvēlaties, jums piešķirtais velosipēds, rēķinu un drošības naudas ieraksti un maksājumu apstiprinājumi. Kartes dati tiek ievadīti un glabāti pie mūsu maksājumu pakalpojumu sniedzēja; mēs neglabājam pilnus kartes numurus.",
        "Parakstīšana un saziņa: īres līguma un tā parakstīšanas ieraksti un e-pasti un ziņojumi, ko apmaināmies ar jums par jūsu rezervāciju un īri.",
        "Tehniskie un lietošanas dati: ierīces, pārlūkprogrammas un līdzīga informācija un — tikai tad, kad esat piekritis — analītika par to, kā jūs izmantojat tīmekļa vietni. Skatiet sīkdatņu politiku zemāk.",
      ],
    },
    {
      heading: "Kāpēc mēs izmantojam jūsu datus un mūsu juridiskie pamati",
      body: [
        "Lai pieņemtu un pārvaldītu jūsu rezervāciju, pārbaudītu jūsu identitāti, sagatavotu un parakstītu īres līgumu, nodotu un nodrošinātu jūsu īres darbību un sniegtu servisa un apkopes atbalstu — juridiskais pamats: līguma ar jums izpilde (un pasākumi pēc jūsu pieprasījuma pirms tā noslēgšanas).",
        "Lai pieņemtu maksājumus un drošības naudu, pārvaldītu atjaunojumus un atgūtu summas, ko esat parādā par bojājumiem, trūkstošu aprīkojumu vai novēlotu vai neatgriešanu — juridiskais pamats: līguma izpilde un mūsu likumīgās intereses saņemt samaksu un aizsargāt mūsu īpašumu.",
        "Lai izpildītu juridiskos pienākumus, piemēram, grāmatvedības, nodokļu un patērētāju tiesību ierakstu kārtošanu, un atbildētu uz likumīgiem pieprasījumiem — juridiskais pamats: juridiska pienākuma izpilde.",
        "Lai uzturētu mūsu pakalpojumu un tīmekļa vietni drošu, novērstu krāpšanu un ļaunprātīgu izmantošanu, izskatītu sūdzības un aizstāvētu juridiskas prasības — juridiskais pamats: mūsu likumīgās intereses pakalpojuma darbībā un aizsardzībā. Ja paļaujamies uz likumīgajām interesēm, mēs tās līdzsvarojam ar jūsu tiesībām.",
        "Lai izprastu un uzlabotu to, kā tīmekļa vietne un rezervēšanas plūsma tiek izmantota, izmantojot analītiku — juridiskais pamats: jūsu piekrišana, kuru varat atsaukt jebkurā laikā, neietekmējot jūsu īri.",
      ],
    },
    {
      heading: "Ar ko mēs kopīgojam jūsu datus (apstrādātāji)",
      body: [
        "Mēs izmantojam uzticamus pakalpojumu sniedzējus, kuri apstrādā personas datus mūsu vārdā kā apstrādātāji saskaņā ar datu apstrādes līgumiem un tikai pēc mūsu norādījumiem. Mēs nepārdodam jūsu personas datus.",
        "Resend — sūta darījumu un servisa e-pastus par jūsu rezervāciju un īri.",
        "Montonio — apstrādā karšu maksājumus un drošības naudu, tiklīdz tiešsaistes karšu maksājumi ir ieviesti.",
        "Dokobit — nodrošina ar identitāti pamatotu īres līguma elektronisku parakstīšanu, tiklīdz tiešsaistes e-parakstīšana ir ieviesta.",
        "Vercel — mitina un apkalpo rentaro tīmekļa vietni.",
        "Railway — mitina mūsu lietojumprogrammas aizmuguri un datubāzi ES.",
        "Google Analytics un PostHog — nodrošina tīmekļa vietnes un produkta analītiku un darbojas tikai tad, kad esat piekritis; PostHog ir mitināts ES.",
        "Mēs varam arī izpaust datus, ja to prasa likums, lai aizsargātu mūsu tiesības vai drošību, vai saistībā ar uzņēmuma pārdošanu vai reorganizāciju, kuras gadījumā tie paliek aizsargāti saskaņā ar šo politiku.",
      ],
    },
    {
      heading: "Starptautiskā datu nodošana",
      body: [
        "Mēs cenšamies uzturēt personas datus Eiropas Ekonomikas zonā (EEZ). Mūsu mitināšana (Vercel, Railway) un ES mitinātā analītika (PostHog) ir konfigurētas, lai dati paliktu ES/EEZ, kur tas iespējams.",
        "Daži pakalpojumu sniedzēji, piemēram, Google Analytics, var apstrādāt ierobežotus datus ārpus EEZ. Kad tas notiek, mēs paļaujamies uz atbilstošiem aizsardzības pasākumiem — piemēram, Eiropas Komisijas standarta līguma klauzulām vai lēmumu par atbilstību — lai jūsu dati paliktu aizsargāti atbilstoši ES standartiem.",
      ],
    },
    {
      heading: "Cik ilgi mēs glabājam jūsu datus",
      body: [
        "Mēs glabājam personas datus tikai tik ilgi, cik tas ir nepieciešams iepriekš minētajiem mērķiem, pēc tam tos dzēšam vai anonimizējam.",
        "Rezervēšanas un īres ieraksti, kā arī grāmatvedības un nodokļu ieraksti tiek glabāti Igaunijas likumā noteiktajos periodos (grāmatvedības ieraksti parasti tiek glabāti septiņus gadus).",
        "Identitātes pārbaudes dokumenti un jūsu personas identifikācijas kods tiek glabāti tikai tik ilgi, cik tas ir nepieciešams īres līguma noslēgšanai un atbalstam un juridisko pienākumu izpildei, un pēc tam tiek dzēsti. Analītikas dati tiek glabāti ierobežotu periodu saskaņā ar rīku iestatījumiem, un piekrišanas ieraksti tiek glabāti tik ilgi, cik tas ir nepieciešams, lai pierādītu jūsu izvēli. Mārketinga vai neobligāto ziņojumu piekrišanas tiek glabātas, līdz tās atsaucat.",
      ],
    },
    {
      heading: "Jūsu tiesības",
      body: [
        "Saskaņā ar VDAR jums ir tiesības piekļūt saviem personas datiem; labot neprecīzus datus; dzēst datus; ierobežot vai iebilst pret noteiktu apstrādi; uz datu pārnesamību; un, ja paļaujamies uz piekrišanu, atsaukt to jebkurā laikā, neietekmējot jau veikto apstrādi.",
        "Lai īstenotu jebkuras no šīm tiesībām, sazinieties ar mums, izmantojot iepriekš norādīto informāciju. Mēs atbildēsim likumā noteiktajos termiņos. Jums ir arī tiesības iesniegt sūdzību uzraudzības iestādei — Igaunijā Datu aizsardzības inspekcijai (Andmekaitse Inspektsioon) — vai iestādei tajā ES valstī, kurā dzīvojat vai strādājat.",
      ],
    },
    {
      heading: "Automatizēta lēmumu pieņemšana",
      body: [
        "Mēs nepieņemam lēmumus par jums, balstoties tikai uz automatizētu apstrādi, kas rada juridiskas vai līdzīgi būtiskas sekas. Identitātes pārbaude un īres apstiprināšana ietver cilvēka veiktu pārskatīšanu.",
      ],
    },
    /* Sīkdatņu politika iekļauta privātuma politikā, lai piekrišanas baneris
       un kājene (kas abi saista uz /privacy) to sasniegtu. cookiePolicy
       eksports iepriekš atkārtoti izmanto to pašu saturu jebkurai nākotnes
       /cookies lapai. */
    ...cookiePolicy.sections,
  ],
};
