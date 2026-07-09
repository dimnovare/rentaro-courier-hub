/**
 * SOURCE: /api/public/legal — structured legal/policy copy for the
 * /rules, /privacy and /terms pages.
 *
 * rentaro is operated by Valguse Kodu OÜ, an Estonian private limited company
 * renting delivery e-bikes by the month to couriers in Estonia (Tallinn) and
 * Latvia (Riga). Pricing, the 30-day minimum and the deposit (equal to the
 * selected plan's 30-day price) reflect the locked business rules.
 *
 * Company-specific details (registration code, registered address, VAT number,
 * support email and phone) are taken from the signed contract template. Brand
 * prose uses lowercase "rentaro"; the operating legal entity is
 * "Valguse Kodu OÜ", which operates the Rentaro brand.
 */

import type { LegalDoc } from "./types";

/** Shared "last updated" date for every legal document. */
const LAST_UPDATED = "30. toukokuuta 2026";

/* ============================================================
   Rental rules — /rules
   ============================================================ */
export const rentalRules: LegalDoc = {
  title: "Vuokrausehdot",
  updated: LAST_UPDATED,
  intro:
    "Nämä ehdot selittävät, miten rentaron sähköpyörän vuokraus käytännössä toimii — kuka voi vuokrata, 30 päivän vähimmäisaika ja sopimuksen ehdot, vakuutesi, mitä vuokraan sisältyy, miten pyörää käytetään ja huolletaan sekä mitä tapahtuu huollon, vaurioiden, varkauden ja palautusten yhteydessä. Ne ovat osa vuokrasopimusta, jonka allekirjoitat Valguse Kodu OÜ:n kanssa ennen noutoa. Jos jokin tässä on ristiriidassa allekirjoittamasi vuokrasopimuksen kanssa, sovelletaan allekirjoitettua sopimusta.",
  sections: [
    {
      heading: "Kuka voi vuokrata",
      body: [
        "Vuokrataksesi rentaron sähköpyörän sinun on oltava vähintään 18-vuotias, sinulla on oltava voimassa oleva viranomaisen myöntämä henkilöllisyystodistus ja sinun on suoritettava henkilöllisyyden todentamisemme. Sinun on annettava paikkansapitäviä ja ajantasaisia tietoja sekä oltava oikeustoimikelpoinen tekemään vuokrasopimus Virossa tai Latviassa.",
        "Vuokraus on henkilökohtainen sinulle, nimetylle vuokraajalle. Olet vastuussa pyörästä koko sen ajan, kun se on hallussasi. Et saa lainata, alivuokrata, luovuttaa tai siirtää pyörää, akkua, laturia, lukkoa tai lisävarusteita kenellekään muulle, etkä saa antaa kenenkään muun ajaa sillä, ellemme ole sopineet tästä kanssasi kirjallisesti.",
        "Voimme hylätä varauksen tai keskeyttää tai päättää voimassa olevan vuokrauksen, jos henkilöllisyyttä ei voida todentaa, jos annetut tiedot osoittautuvat virheellisiksi, jos maksua tai vakuutta ei voida veloittaa tai jos näitä ehtoja tai vuokrasopimusta ei noudateta.",
      ],
    },
    {
      heading: "Vuokra-aika ja sopimukset",
      body: [
        "Vähimmäisvuokra-aika on 30 päivää. Valitset sopimuksesi varauksen yhteydessä: joustava 30 päivän sopimus, 6 kuukauden sopimus tai 12 kuukauden sopimus. Pidemmissä sopimuksissa on alempi päivähinta pidempää sitoutumista vastaan.",
        "Hinta veloitetaan 30 päivän jaksoittain valitsemasi sopimuksen päivähinnan mukaan: 5,90 € päivässä 30 päivän sopimuksessa (177 € / 30 päivää), 4,90 € päivässä 6 kuukauden sopimuksessa (147 € / 30 päivää) ja 3,90 € päivässä 12 kuukauden sopimuksessa (117 € / 30 päivää). 6 kuukauden ja 12 kuukauden hinnat ovat toistuva 30 päivän hinta valitsemasi sitoutumisajan keston ajan — ne eivät ole yksittäinen kertamaksu koko jaksolta.",
        "Maksut kulkevat 30 päivän jaksoissa. Ensimmäinen maksu — joka erääntyy hyväksynnän jälkeen, kun olet hyväksynyt vuokrasopimuksen — kattaa ensimmäiset 30 päivää, valitsemasi lisävarusteet ja toimituksen valinneilla kertaluonteisen toimitusmaksun; palautettava vakuus maksetaan sen yhteydessä. Ennen jokaista seuraavaa 30 päivän jaksoa lähetämme laskun kyseisestä jaksosta (pyörä ja lisävarusteesi), maksettavaksi pankkisiirrolla. Toimitusmaksua ei koskaan veloiteta uudelleen.",
        "Ensimmäisten 30 päivän jälkeen voit jatkaa kuukausi kerrallaan, vaihtaa pidempään sopimukseen tai järjestää palautuksen. Jatkaaksesi, muuttaaksesi tai päättääksesi vuokrauksen ilmoita meille noudon yhteydessä vahvistettujen yhteyskanavien kautta hyvissä ajoin ennen nykyisen jaksosi päättymistä. Pidemmän sitoumuksen ennenaikainen päättäminen voi vaikuttaa vakuuteen ja vuokrasopimuksessasi sovittuihin ennenaikaisen päättämisen ehtoihin.",
      ],
    },
    {
      heading: "Vakuus",
      body: [
        "Palautettava vakuus vaaditaan ennen noutoa. Vakuus vastaa valitsemasi sopimuksen 30 päivän hintaa: 177 € 30 päivän sopimuksessa, 147 € 6 kuukauden sopimuksessa ja 117 € 12 kuukauden sopimuksessa. Tarkka summa vahvistetaan varauksen yhteydessä ennen maksamista.",
        "Vakuus turvaa vuokrauksen mukaiset velvoitteesi. Voimme käyttää sitä tai vähentää siitä summia, jotka olet meille velkaa — esimerkiksi normaalin kulumisen ylittävät vauriot, puuttuvat tai vaurioituneet varusteet (lukko, laturi, akku tai lisävarusteet), maksamattomat vuokramaksut, puhdistuksen, jos pyörä palautetaan erittäin likaisena, tai myöhästyneestä tai palauttamatta jättämisestä aiheutuvat maksut.",
        "Kun pyörä on palautettu ja tarkastettu ja kun mahdolliset velat on selvitetty, palautamme jäljellä olevan vakuuden käytettyyn maksutapaan, yleensä 14 päivän kuluessa palautuksesta. Jos meidän on vähennettävä vakuudesta, selitämme syyn ja summan ennen palautuksen suorittamista.",
      ],
    },
    {
      heading: "Mitä vuokraan sisältyy",
      body: [
        "Jokaiseen sopimukseen sisältyy sähköpyörä, akku ja laturi sekä säännöllinen huoltotuki — jarrujen ja vaihteiden säädöt, renkaanpuhkeamisten hoito, yleishuolto ja kulumiseen liittyvät korjaukset, jotka eivät johdu väärinkäytöstä.",
        "Valinnaiset lisävarusteet, kuten lisäakku, kuljetuslaukku, puhelinteline, kypärä, järeä lukko tai talvirenkaat, voidaan lisätä vuokraan lisämaksusta ja ne vahvistetaan varauksen yhteydessä. Kaikki lisävarusteet ovat osa vuokrausta ja ne on palautettava pyörän mukana.",
      ],
    },
    {
      heading: "Sallittu ja kielletty käyttö",
      body: [
        "rentaron sähköpyörät on rakennettu kaupunkikuljetusvuoroihin ja jokapäiväiseen kaupunkiajoon toiminta-alueidemme kaupungeissa. Aja pyörän ilmoitettujen kuorma- ja ajajan painorajojen sisällä, pidä se liikennekelpoisessa kunnossa ja käytä sitä vain niillä pinnoilla ja olosuhteissa, joihin se on suunniteltu.",
        "Et saa: muuttaa, peukaloida tai yrittää korjata pyörää, akkua, moottoria, ohjainta, lukkoa tai elektroniikkaa; poistaa tai ohittaa mitään seuranta-, lukitus- tai nopeudenrajoituslaitteita; käyttää pyörää kilpailuun, temppuiluun, maastoajon väärinkäyttöön, hinaamiseen tai kuljettamaan matkustajia, joita varten sitä ei ole rakennettu; alivuokrata tai kaupallisesti edelleenvuokrata pyörää; tai käyttää sitä mihinkään laittomaan tarkoitukseen tai alkoholin tai huumeiden vaikutuksen alaisena.",
        "Et saa viedä pyörää Viron ja Latvian ulkopuolelle tai minkään ilmoittamamme palvelualueen ulkopuolelle ilman etukäteen antamaamme kirjallista suostumusta.",
      ],
    },
    {
      heading: "Liikennesäännöt ja turvallinen ajaminen",
      body: [
        "Olet vastuussa lainmukaisesta ja turvallisesta ajamisesta. Noudata Virossa tai Latviassa sovellettavia tieliikenne- ja kevyiden sähköajoneuvojen sääntöjä, mukaan lukien säännöt siitä, missä saat ajaa, nopeudesta, etuajo-oikeudesta ja jalankulkijoille väistämisestä. Käytä valoja pimeässä tai huonossa näkyvyydessä ja osoita aikomuksesi muille tienkäyttäjille.",
        "Suosittelemme vahvasti kypärän käyttöä jokaisella ajolla; joissakin tilanteissa ja joillekin ajajille se on lain mukaan pakollista. Älä käytä puhelinta kädessä ajaessasi — käytä puhelintelinettä. Olet vastuussa kaikista sakoista, seuraamuksista tai maksuista, jotka aiheutuvat siitä, miten ajat tai mihin pysäköit tai jätät pyörän.",
      ],
    },
    {
      heading: "Lataaminen ja akun hoito",
      body: [
        "Lataa akku vain toimittamallamme laturilla ja noudata noudon yhteydessä annettuja turvallisen lataamisen ohjeita. Lataa kuivassa, tuuletetussa sisätilassa kaukana lämmönlähteistä ja syttyvistä materiaaleista, älä jätä latautuvaa akkua valvomatta pitkiksi ajoiksi äläkä lataa akkua, joka on näkyvästi vaurioitunut, pullistunut tai märkä — ota sen sijaan yhteyttä meihin.",
        "Pidä akku ja laturi kuivina ja suojaa niitä iskuilta ja äärilämpötiloilta. Jos vuokraat lisäakun pidempiä kuljetuspäiviä varten, käsittele sitä yhtä huolellisesti kuin pyörää. Olet vastuussa akun ja laturin katoamisesta tai vaurioitumisesta niiden ollessa hallussasi.",
      ],
    },
    {
      heading: "Lukitseminen ja turvallisuus",
      body: [
        "Aina kun pyörä on ilman valvontaa, vaikka hetkenkin, lukitse se toimitetulla lukolla kiinteään, vankkaan esineeseen ja kiinnitä se noudon yhteydessä annettujen ohjeiden mukaisesti. Älä koskaan jätä pyörää lukitsematta, älä koskaan jätä akkua tai laturia valvomatta julkisille paikoille äläkä jätä avaimia pyörän luokse.",
        "Pyörän lukitsematta tai kiinnittämättä jättäminen asianmukaisesti voi tehdä sinusta vastuullisen siitä aiheutuvan katoamisen, varkauden tai vaurion kustannuksista. Jos malliisi sisältyy ylimääräisiä turvavarusteita, käytä niitä ohjeiden mukaisesti.",
      ],
    },
    {
      heading: "Huolto ja vikojen ilmoittaminen",
      body: [
        "Pidä pyörä kohtuullisen puhtaana ja tarkista ennen jokaista vuoroa, että jarrut, renkaat, valot ja akku toimivat. Ilmoita meille kaikista vioista, varoituksista, epätavallisista äänistä tai vaurioista heti kun huomaat ne, ja lopeta ajaminen, jos pyörä on turvaton.",
        "Säännöllinen ja kulumiseen liittyvä huolto sisältyy vuokraan. Älä järjestä kolmannen osapuolen korjauksia tai muutoksia ottamatta ensin yhteyttä meihin — luvattomat korjaukset voidaan veloittaa sinulta. Kun pyörä tarvitsee pidempää korjausta, pyrimme tarjoamaan korvaavan pyörän varaston salliessa, jotta vuorosi jatkuvat, mutta korvaavaa pyörää ei voida taata kaikkina aikoina.",
      ],
    },
    {
      heading: "Vauriot, varkaus ja onnettomuudet",
      body: [
        "Ilmoita meille mahdollisimman pian — ja viimeistään 24 tunnin kuluessa — kaikista pyörää tai sen varusteita koskevista onnettomuuksista, vaurioista, katoamisesta tai varkaudesta. Varkaustapauksessa, ilkivallan tai liikenneonnettomuuden sattuessa sinun on myös ilmoitettava siitä poliisille, hankittava viitenumero ja jaettava se kanssamme. Älä myönnä syyllisyyttä tai tee sovintoa kolmansien osapuolten kanssa puolestamme.",
        "Jos pyörä varastetaan, älä lopeta sen etsimistä ohjeestamme, palauta avain ja jäljellä olevat varusteet meille ja toimita poliisin viitenumero. Olet vastuussa pyörästä, kunnes se löytyy tai asia päätetään kanssamme.",
        "Olet vastuussa normaalin kulumisen ylittävistä vaurioista, puuttuvista tai vaurioituneista varusteista sekä katoamisesta tai varkaudesta, joka johtuu siitä, ettet lukinnut, kiinnittänyt tai huolehtinut pyörästä vaaditulla tavalla. Kun olet vastuussa, voimme veloittaa korjaus- tai vaihtokustannukset pyörän ja varusteiden arvoon asti ja käyttää vakuuden tähän. Selitämme kaikki maksut ennen niiden veloittamista.",
      ],
    },
    {
      heading: "Talvi- ja kausikäyttö",
      body: [
        "rentaron pyörillä voi ajaa ympäri vuoden, mutta talviolosuhteet vaativat erityistä varovaisuutta. Vähennä nopeutta, varaa pidemmät jarrutusmatkat ja ole erityisen varovainen jäällä, lumella ja märillä lehdillä. Kylmä sää voi myös lyhentää akun kestoa latausten välillä.",
        "Talvirenkaat ovat saatavilla lisävarusteena kylmempinä kuukausina. Pidä akku ja laturi lämpiminä ja kuivina, kun voit, sillä erittäin matalat lämpötilat voivat vaikuttaa akun suorituskykyyn ja lataamiseen.",
      ],
    },
    {
      heading: "Palautukset ja luovutus",
      body: [
        "Vuokrauksen päättyessä palauta pyörä sovittuna aikana ja paikassa kaikkien toimitettujen varusteiden kanssa — akku, laturi, lukko, avaimet ja mahdolliset lisävarusteet — puhtaassa, toimivassa kunnossa normaali kuluminen huomioiden.",
        "Tarkastamme pyörän luovutuksen yhteydessä ja kirjaamme sen kunnon. Kun mahdolliset avoimet maksut on selvitetty, vapautamme jäljellä olevan vakuuden edellä kuvatulla tavalla. Myöhässä palautetuista, vajaina palautetuista tai kokonaan palauttamatta jätetyistä pyöristä voi aiheutua lisäpäivämaksuja, vaihtokustannuksia ja vähennyksiä vakuudesta, ja voimme käsitellä palauttamatta jätetyn pyörän menetyksenä ja periä sen arvon.",
      ],
    },
  ],
};

/* ============================================================
   Terms and conditions — /terms
   ============================================================ */
export const termsOfService: LegalDoc = {
  title: "Käyttöehdot",
  updated: LAST_UPDATED,
  intro:
    "Nämä ehdot säätelevät rentaron verkkosivuston käyttöäsi ja sähköpyörän vuokrauksen varaamista. rentaroa operoi Valguse Kodu OÜ. Ehdot täydentävät vuokrausehtoja ja vuokrasopimusta, jonka allekirjoitat ennen noutoa; allekirjoitettu vuokrasopimus säätelee itse vuokrausta. Lue nämä ehdot huolellisesti ennen varaamista.",
  sections: [
    {
      heading: "Keitä olemme ja miten meihin saa yhteyden",
      body: [
        "rentaro-palvelua operoi Valguse Kodu OÜ (toimii Rentaro-tuotemerkillä), Virossa rekisteröity osakeyhtiö (rekisterinumero 14621591, rekisteröity osoite Narva mnt 128-4, Tallinn 10127, Viro, ALV-numero EE102246089). Näissä ehdoissa \"rentaro\", \"me\" ja \"meidän\" tarkoittavat Valguse Kodu OÜ:tä (toimii Rentaro-tuotemerkillä), ja \"sinä\" tarkoittaa asiakasta.",
        "Voit ottaa meihin yhteyttä sähköpostitse osoitteessa info@rentaro.ee tai puhelimitse numerossa +372 5649 7933. Nämä ehdot on laadittu englanniksi; vuokrasopimus ja kaikki vaaditut lakisääteiset tiedot toimitetaan sinulle ennen sitoutumistasi.",
      ],
    },
    {
      heading: "Näistä ehdoista",
      body: [
        "Käyttämällä rentaron verkkosivustoa tai lähettämällä varauksen hyväksyt nämä ehdot. Jos et hyväksy niitä, älä käytä verkkosivustoa tai varaa vuokrausta.",
        "Voimme päivittää näitä ehtoja ajoittain, esimerkiksi heijastaaksemme muutoksia palvelussamme, hinnoittelurakenteessamme tai laissa. Verkkosivustolla julkaistua versiota sovelletaan sen käyttöösi, ja vuokraukseen sovelletaan niitä ehtoja, jotka ovat voimassa vuokrauksesi vahvistuessa. Annamme kohtuullisen ennakkoilmoituksen olennaisista muutoksista, jotka vaikuttavat voimassa olevaan vuokraukseen.",
      ],
    },
    {
      heading: "rentaro-palvelu",
      body: [
        "rentaro tarjoaa kuukausittaisia ja pidempiaikaisia sähköpyörävuokrauksia kuljettajille suunnattuna sekä lisävarusteita ja huoltotukea Virossa (Tallinna) ja Latviassa (Riika). Pyörämme soveltuvat kaupunkikuljetustyöhön.",
        "rentaro on itsenäinen vuokrauspalvelu. Emme ole virallisesti sidoksissa Boltiin, Woltiin tai mihinkään muuhun kuljetusalustaan, emme ole niiden kumppaneita emmekä niiden suosittelemia. Mikä tahansa maininta kuljetustyöstä kuvaa, mihin pyörät soveltuvat, eikä viittaa kumppanuuteen.",
      ],
    },
    {
      heading: "Varaukset ja sopimuksen syntyminen",
      body: [
        "Verkkosivuston kautta lähetetty varaus on vuokrauspyyntö; se ei itsessään luo sitovaa vuokrausta. Sitova vuokraus syntyy vasta, kun vahvistamme varauksesi, suoritat henkilöllisyyden todentamisen, maksat ensimmäisen jakson ja vakuuden sekä allekirjoitat vuokrasopimuksen.",
        "Voimme hylätä tai peruuttaa varauksen ennen kuin siitä tulee sitova — esimerkiksi jos henkilöllisyyttä ei voida todentaa, jos sopivaa pyörää ei ole saatavilla, jos maksua tai vakuutta ei voida veloittaa tai jos näitä ehtoja tai vuokrausehtoja ei täytetä. Jos peruutamme ennen vuokrauksen alkamista, palautamme kaikki kyseisestä varauksesta maksamasi summat.",
      ],
    },
    {
      heading: "Henkilöllisyyden todentaminen ja allekirjoittaminen",
      body: [
        "Ennen vuokrauksen alkamista todennamme henkilöllisyytesi ja annamme sinun allekirjoittaa vuokrasopimuksen. Henkilöllisyystodistukset ja kaikki vaaditut henkilötiedot kerätään ja käsitellään turvallisesti tietosuojakäytäntömme kuvaamalla tavalla.",
        "Vuokrasopimus allekirjoitetaan paikan päällä noudon yhteydessä, tai — jos lähetämme sopimuksen sinulle etukäteen — voit allekirjoittaa sen itse ja palauttaa allekirjoitetun kopion vuokrausportaalisi kautta, joko paperilla tai digitaalisesti (esim. DigiDoc / Smart-ID). Vuokraus ei voi alkaa eikä pyörää luovuteta ennen kuin todentaminen on valmis ja sopimus on allekirjoitettu.",
      ],
    },
    {
      heading: "Maksut, laskutus ja maksaminen",
      body: [
        "Hinta on 30 päivän jaksoittain valitsemasi sopimuksen päivähinnan mukaan, laskettuna päivähintana kerrottuna 30:llä: 5,90 €/päivä = 177 € / 30 päivää (30 päivän sopimus), 4,90 €/päivä = 147 € / 30 päivää (6 kuukauden sopimus) ja 3,90 €/päivä = 117 € / 30 päivää (12 kuukauden sopimus). Vähimmäisvuokra-aika on 30 päivää. Hinnat sisältävät arvonlisäveron soveltuvin osin.",
        "Ensimmäinen maksu erääntyy, kun varauksesi on hyväksytty ja olet hyväksynyt vuokrasopimuksen. Se kattaa ensimmäisen 30 päivän jakson, valitsemasi lisävarusteet ja — jos valitsit toimituksen maksuttoman noudon sijaan — kertaluonteisen toimitusmaksun; palautettava vakuus maksetaan sen yhteydessä. Jokaisesta seuraavasta sopimuksesi 30 päivän jaksosta lähetämme laskun ennen jakson alkua — pyörästä ja lisävarusteistasi kyseiseltä jaksolta — maksettavaksi pankkisiirrolla. Toimitusmaksu veloitetaan vain kerran, eikä se koskaan ole osa toistuvaa 30 päivän hintaa.",
        "Maksut suoritetaan pankkisiirrolla laskussa ilmoitetulle tilille tai käteisellä, jos siitä on sovittu luovutuksen yhteydessä. Vaurioista, puuttuvista varusteista tai myöhästyneestä tai palauttamatta jättämisestä aiheutuvat maksut laskutetaan vuokrausehdoissa esitetyllä tavalla. Jos maksua ei suoriteta eräpäivään mennessä, voimme keskeyttää vuokrauksen, kunnes asia on selvitetty. Hinnat voivat muuttua tulevien varausten osalta tai uusinnoissa sitoutumisaikasi jälkeen kohtuullisella ennakkoilmoituksella.",
      ],
    },
    {
      heading: "Vakuus ja vastuusi",
      body: [
        "Palautettava vakuus, joka vastaa sopimuksesi 30 päivän hintaa (177 €, 147 € tai 117 €), veloitetaan ennen noutoa ja käsitellään vuokrausehdoissa kuvatulla tavalla. Voimme käyttää sitä velkaamiesi summien kattamiseen ja palauttaa loppuosan, kun pyörä on palautettu ja tarkastettu.",
        "Olet vastuussa pyörästä ja varusteista niiden ollessa hallussasi. Kun olet vastuussa normaalin kulumisen ylittävistä vaurioista, puuttuvista varusteista tai katoamisesta tai varkaudesta, joka johtuu siitä, ettet kiinnittänyt pyörää, vastuusi voi ylittää vakuuden pyörän ja varusteiden korjaus- tai vaihtoarvoon asti. Emme ole vastuussa ansionmenetyksestäsi tai muista välillisistä menetyksistä, jotka aiheutuvat pyörän käyttökelvottomuudesta, paitsi jos laki ei salli tämän poissulkemista.",
      ],
    },
    {
      heading: "Toimitus, nouto ja velvollisuutesi",
      body: [
        "Sovimme kanssasi noutoa tai toimitusta koskevan ajan ja paikan. Sinun on oltava paikalla, tuotava voimassa oleva henkilöllisyystodistus ja suoritettava luovutus. Luovutuksen yhteydessä vahvistat pyörän kunnon ja vastaanotat vuokraukseesi kuuluvat varusteet.",
        "Koko vuokrauksen ajan sitoudut antamaan paikkansapitäviä tietoja, pitämään yhteys- ja maksutietosi ajantasaisina, ajamaan lainmukaisesti, huolehtimaan pyörästä ja varusteista sekä noudattamaan vuokrausehtoja — mukaan lukien lataaminen, lukitseminen, huolto, vikojen ilmoittaminen sekä vaurioiden, varkauden ja onnettomuuksien menettely.",
      ],
    },
    {
      heading: "Palvelumme ja tuki",
      body: [
        "Tarjoamme verkkosivuston ja vuokrauspalvelun kohtuullisella ammattitaidolla ja huolellisuudella. Säännöllinen ja kulumiseen liittyvä huolto sisältyy jokaiseen sopimukseen, ja pyrimme pitämään pyöräsi tiellä ja tarjoamaan korvaavan pyörän, kun korjaus kestää pidempään, varaston salliessa.",
        "Saatamme joutua suorittamaan huoltoja, takaisinkutsuja tai turvallisuustarkastuksia vuokrauksesi aikana ja järjestämme nämä kanssasi. Emme takaa verkkosivuston keskeytyksetöntä saatavuutta emmekä sitä, että tietty pyörä, malli tai lisävaruste on aina saatavilla.",
      ],
    },
    {
      heading: "Keskeyttäminen ja päättäminen",
      body: [
        "Voimme keskeyttää tai päättää vuokrauksen, ennakkoilmoituksella kohtuudella mahdollisuuksien mukaan, jos rikot näitä ehtoja, vuokrausehtoja tai vuokrasopimusta; jos maksua tai vakuutta ei voida veloittaa; jos henkilöllisyyttä tai tietoja ei voida todentaa; jos pyörää käytetään laittomasti tai turvattomasti; tai jos laki sitä edellyttää. Päättämisen yhteydessä sinun on palautettava pyörä ja kaikki varusteet viipymättä.",
        "Voit päättää vuokrauksesi sopimuksesi ja vuokrausehtojen mukaisesti — 30 päivän vähimmäisajan päättyessä joustavassa sopimuksessa tai sovitulla tavalla pidemmän sitoumuksen osalta. Sitoutetun sopimuksen ennenaikaiseen päättämiseen voivat liittyä vuokrasopimuksessasi esitetyt ennenaikaisen päättämisen ehdot.",
      ],
    },
    {
      heading: "Peruuttaminen ja peruuttamisoikeus",
      body: [
        "Jos olet kuluttaja EU:ssa, sinulla on yleensä oikeus peruuttaa etäsopimus 14 päivän kuluessa sen tekemisestä syytä ilmoittamatta. Peruuttaaksesi ilmoita meille selkeästi tuon ajan kuluessa edellä mainittuja yhteystietoja käyttäen; sinun ei tarvitse käyttää tiettyä lomaketta.",
        "Koska vuokraus on palvelu, voit pyytää meitä aloittamaan sen 14 päivän peruuttamisajan aikana. Jos pyydät meitä aloittamaan (esimerkiksi ottamalla pyörän) ja peruutat sen jälkeen, sinun on maksettava suhteellinen osuus jo toimitetusta palvelun osasta siihen hetkeen asti, jolloin ilmoitat peruuttavasi. Jos palvelu suoritetaan kokonaan 14 päivän aikana nimenomaisella etukäteen antamallasi suostumuksella ja vahvistuksellasi siitä, että menetät peruuttamisoikeuden, kun palvelu on suoritettu kokonaan, peruuttamisoikeus ei enää sovellu.",
        "Mikään tässä kohdassa ei rajoita kohdassa \"Varaukset ja sopimuksen syntyminen\" kuvattuja peruutus- ja palautusoikeuksia tai mitään oikeuksia, jotka sinulla on Viron tai EU:n kuluttajalainsäädännön nojalla.",
      ],
    },
    {
      heading: "Vakuutus",
      body: [
        "Ellemme nimenomaisesti kirjallisesti ilmoita sinulle, että vuokraukseesi sisältyy tietty vakuutusturva, sinun ei pidä olettaa, että pyörä, sinä ajajana tai kolmannet osapuolet ovat vakuutettuja rentaron kautta. Mahdollinen sisältyvä vakuutusturva kuvataan vuokrasopimuksessasi sekä se, mitä se kattaa ja mahdollinen sovellettava omavastuu.",
        "Suosittelemme, että harkitset omaa sopivaa vakuutusta kuljetustyötä ja henkilövahinkoja varten. Olet edelleen vastuussa pyörästä ja varusteista sekä ajamisestasi aiheutuvista kolmansien osapuolten vaatimuksista vuokrausehdoissa ja vuokrasopimuksessa esitetyllä tavalla.",
      ],
    },
    {
      heading: "Vastuunrajoitus",
      body: [
        "Tarjoamme verkkosivuston ja palvelun kohtuullisella huolellisuudella, mutta lain sallimissa rajoissa emme ole vastuussa välillisistä, satunnaisista tai seurannaisvahingoista tai voiton, tulon tai ansioiden menetyksestä, jotka aiheutuvat verkkosivustosta, vuokrauksesta, käyttökatkoksesta tai pyörän, mallin tai lisävarusteen saatavuuden puutteesta.",
        "Mikään näissä ehdoissa ei sulje pois tai rajoita vastuutamme silloin, kun se olisi lainvastaista — mukaan lukien vastuu kuolemasta tai henkilövahingosta, joka aiheutuu huolimattomuudestamme, petoksesta tai mistä tahansa kuluttajana sinulla olevista oikeuksista, joita ei voida sulkea pois. Yksityiskohtaiset vastuuehdot itse vuokrauksesta on esitetty vuokrausehdoissa ja vuokrasopimuksessa.",
      ],
    },
    {
      heading: "Ylivoimainen este",
      body: [
        "Emme ole vastuussa velvoitteidemme täyttämättä jättämisestä tai niiden täyttämisen viivästymisestä, kun se johtuu kohtuullisen vaikutusvaltamme ulkopuolisista tapahtumista — mukaan lukien äärimmäiset sääolosuhteet, luonnonkatastrofit, tulipalo, tulva, epidemia tai pandemia, lakot, yleishyödyllisten palvelujen, liikenteen tai viestintäverkkojen häiriöt, vaikutusvaltamme ulkopuolinen varkaus tai ilkivalta tai viranomaisten tai julkisten viranomaisten toimet.",
        "Jos tällainen tapahtuma vaikuttaa vuokraukseesi, ilmoitamme sinulle ja työskentelemme kanssasi oikeudenmukaisen ratkaisun löytämiseksi, joka voi sisältää uudelleenaikatauluttamisen, korvaavan pyörän tarjoamisen mahdollisuuksien mukaan tai vaikuttuneen jakson mukauttamisen.",
      ],
    },
    {
      heading: "Valitukset ja riitojen ratkaisu",
      body: [
        "Jos jokin menee pieleen, ota ensin yhteyttä meihin edellä mainituilla tiedoilla, jotta voimme yrittää korjata asian. Pyrimme vahvistamaan valitukset viipymättä ja ratkaisemaan ne oikeudenmukaisesti.",
        "Jos emme pysty ratkaisemaan riitaa, voit kuluttajana saattaa sen kuluttajariitojen lautakunnan (Tarbijavaidluste komisjon) käsiteltäväksi, joka toimii Viron kuluttajansuoja- ja teknisen valvonnan viraston (Tarbijakaitse ja Tehnilise Järelevalve Amet) yhteydessä, osoitteessa Endla 10a, 10122 Tallinn. Voit myös käyttää Euroopan komission verkkovälitteistä riidanratkaisualustaa osoitteessa ec.europa.eu/odr. Nämä keinot täydentävät oikeuttasi viedä asia tuomioistuimeen.",
      ],
    },
    {
      heading: "Sovellettava laki ja tuomioistuin",
      body: [
        "Näihin ehtoihin ja kaikkiin verkkosivuston kautta varattuihin vuokrauksiin sovelletaan Viron lakia. Jos olet kuluttaja, hyödyt myös asuinmaasi lain pakottavista suojista, eikä mikään tässä poista näitä suojia.",
        "Riidat kuuluvat Viron tuomioistuinten toimivaltaan, ellei pakottava kuluttajalainsäädäntö anna sinulle oikeutta nostaa kanne asuinmaasi tuomioistuimissa. Jos jokin näiden ehtojen osa todetaan täytäntöönpanokelvottomaksi, muut osat pysyvät voimassa.",
      ],
    },
  ],
};

/* ============================================================
   Cookie policy — embedded in the privacy policy and exported
   separately for reuse (e.g. a future /cookies page).
   ============================================================ */
export const cookiePolicy: LegalDoc = {
  title: "Evästekäytäntö",
  updated: LAST_UPDATED,
  intro:
    "Tämä evästekäytäntö selittää rentaron verkkosivuston käyttämät evästeet ja vastaavat tekniikat, mitä ne tekevät ja kuinka kauan ne kestävät. Se on osa tietosuojakäytäntöämme. Hallitset valinnaisia evästeitä ensimmäisellä käynnilläsi näkyvän suostumuspalkin kautta, ja voit muuttaa valintaasi milloin tahansa.",
  sections: [
    {
      heading: "Miten käytämme evästeitä",
      body: [
        "Eväste on pieni tekstitiedosto, jonka selaimesi tallentaa laitteellesi. Käytämme pientä määrää evästeitä, jotta sivusto toimii, muistaaksemme valintasi ja — vain suostumuksellasi — ymmärtääksemme, miten sivustoa käytetään, jotta voimme parantaa sitä.",
        "Ryhmittelemme evästeet ehdottoman välttämättömiksi tai toiminnallisiksi evästeiksi, jotka ovat aina päällä, koska sivusto tarvitsee niitä, sekä analytiikkaevästeiksi, jotka latautuvat vasta sen jälkeen, kun olet hyväksynyt ne. Emme käytä mainos- tai sivustojen välisiä seurantaevästeitä.",
      ],
    },
    {
      heading: "Toiminnalliset evästeet",
      body: [
        "NEXT_LOCALE — muistaa valitsemasi kielen, jotta sivusto näkyy valitsemallasi kielellä seuraavalla käynnilläsi. Toiminnallinen; tallennetaan enintään 12 kuukaudeksi.",
        "rentaro_consent — tallentaa evästevalintasi (\"granted\" tai \"denied\"), jotta emme kysy uudelleen jokaisella käynnillä ja jotta analytiikka pysyy pois päältä, ellet ole suostunut. Ehdottoman välttämätön suostumuksen hallintaa varten; tallennetaan enintään 12 kuukaudeksi.",
      ],
    },
    {
      heading: "Analytiikkaevästeet (suostumukseen perustuvat)",
      body: [
        "Google Analytics — auttaa meitä ymmärtämään yhteenlaskettua, anonymisoitua verkkosivuston käyttöä, kuten mitä sivuja vieraillaan ja miten kävijät liikkuvat varausprosessin läpi. Asettaa Google vasta sen jälkeen, kun olet hyväksynyt analytiikan; evästeet kestävät tyypillisesti istuntosi päättymisestä noin 24 kuukauteen asti.",
        "PostHog — tarjoaa tietosuojatietoista tuoteanalytiikkaa siitä, miten sivustoa ja varausprosessia käytetään, isännöitynä EU:ssa. Asetetaan vasta sen jälkeen, kun olet hyväksynyt analytiikan; evästeet kestävät tyypillisesti noin 12 kuukauteen asti.",
        "Jos kieltäydyt tai valitset vain välttämättömät, näitä analytiikkatyökaluja ei ladata eikä niiden evästeitä aseteta.",
      ],
    },
    {
      heading: "Valintojesi hallinta",
      body: [
        "Kun käyt ensimmäistä kertaa, suostumuspalkki antaa sinun hyväksyä analytiikan, kieltäytyä tai sallia vain välttämättömät evästeet. Valintasi tallennetaan rentaro_consent-evästeeseen, ja analytiikka latautuu vain, jos hyväksyt sen.",
        "Voit muuttaa mielesi milloin tahansa tyhjentämällä rentaro_consent-evästeen selaimestasi, mikä saa palkin näkymään uudelleen, ja säätämällä evästeasetuksia selaimessasi. Ehdottoman välttämättömien tai toiminnallisten evästeiden estäminen voi vaikuttaa sivuston toimintaan, kuten kielesi muistamiseen.",
      ],
    },
  ],
};

/* ============================================================
   Privacy policy — /privacy
   ============================================================ */
export const privacyPolicy: LegalDoc = {
  title: "Tietosuojakäytäntö",
  updated: LAST_UPDATED,
  intro:
    "Tämä käytäntö selittää, mitä henkilötietoja rentaro kerää, miksi ja millä oikeusperusteella käytämme niitä, kenen kanssa jaamme niitä, kuinka kauan säilytämme niitä ja mitkä oikeudet sinulla on EU:n yleisen tietosuoja-asetuksen (GDPR) nojalla. rentaroa operoi Valguse Kodu OÜ, joka on henkilötietojesi rekisterinpitäjä. Se sisältää myös evästekäytäntömme.",
  sections: [
    {
      heading: "Keitä olemme (rekisterinpitäjä)",
      body: [
        "rentaroa operoi Valguse Kodu OÜ (toimii Rentaro-tuotemerkillä), Virossa rekisteröity osakeyhtiö, joka on henkilötiedoistasi vastaava rekisterinpitäjä. Rekisteröity osoite: Narva mnt 128-4, Tallinn 10127, Viro. Rekisterinumero: 14621591.",
        "Kaikissa tietosuojaa koskevissa kysymyksissä tai oikeuksiesi käyttämiseksi ota meihin yhteyttä osoitteessa info@rentaro.ee. Emme ole nimittäneet lakisääteistä tietosuojavastaavaa, kun sellaista ei lain mukaan vaadita; jos tämä muuttuu, tämä yhteystieto päivitetään.",
      ],
    },
    {
      heading: "Keräämämme tiedot",
      body: [
        "Varaus- ja yhteystiedot: etu- ja sukunimesi, sähköpostiosoitteesi, puhelinnumerosi, kaupunkisi ja toivottu aloituspäiväsi sekä mahdolliset meille lähettämäsi viestit.",
        "Henkilöllisyys- ja sopimustiedot: vuokrasopimuksen tekemiseksi keräämme henkilöllisyystodistuksen tiedot ja henkilötunnuksesi tai syntymäaikasi. Nämä kerätään ja käsitellään turvallisesti, niitä käytetään vain todentamiseen ja sopimukseen, eikä niitä tallenneta verkkosivustomme käyttöliittymään.",
        "Vuokraus-, maksu- ja vakuustiedot: valitsemasi sopimus ja lisävarusteet, sinulle osoitettu pyörä, laskutus- ja vakuustiedot sekä maksuvahvistukset. Korttitiedot syötetään maksupalveluntarjoajallemme ja niitä säilyttää maksupalveluntarjoajamme; emme tallenna täydellisiä korttinumeroita.",
        "Allekirjoitus ja viestintä: tiedot vuokrasopimuksesta ja sen allekirjoittamisesta sekä sähköpostit ja viestit, joita vaihdamme kanssasi varauksestasi ja vuokrauksestasi.",
        "Tekniset ja käyttötiedot: laite-, selain- ja vastaavat tiedot sekä — vain suostumuksellasi — analytiikka siitä, miten käytät verkkosivustoa. Katso alla oleva evästekäytäntö.",
      ],
    },
    {
      heading: "Miksi käytämme tietojasi ja oikeusperusteemme",
      body: [
        "Varauksesi vastaanottamiseksi ja hallinnoimiseksi, henkilöllisyytesi todentamiseksi, vuokrasopimuksen valmistelemiseksi ja allekirjoittamiseksi, vuokrauksesi luovuttamiseksi ja hoitamiseksi sekä huolto- ja kunnossapitotuen tarjoamiseksi — oikeusperuste: kanssasi tehdyn sopimuksen täyttäminen (ja pyynnöstäsi tehtävät toimet ennen sen tekemistä).",
        "Maksujen ja vakuuden veloittamiseksi, uusintojen hallinnoimiseksi ja vaurioista, puuttuvista varusteista tai myöhästyneestä tai palauttamatta jättämisestä velkaamiesi summien perimiseksi — oikeusperuste: sopimuksen täyttäminen ja oikeutettu etumme saada maksu ja suojella omaisuuttamme.",
        "Lakisääteisten velvoitteiden täyttämiseksi, kuten kirjanpito, verotus ja kuluttajalainsäädännön mukainen tietojen säilyttäminen, sekä lakisääteisiin pyyntöihin vastaamiseksi — oikeusperuste: lakisääteisen velvoitteen noudattaminen.",
        "Palvelumme ja verkkosivustomme pitämiseksi turvallisena, petosten ja väärinkäytösten estämiseksi, valitusten käsittelemiseksi ja oikeudellisten vaatimusten puolustamiseksi — oikeusperuste: oikeutetut etumme palvelun pyörittämisessä ja suojaamisessa. Kun nojaudumme oikeutettuihin etuihin, punnitsemme niitä oikeuksiasi vastaan.",
        "Ymmärtääksemme ja parantaaksemme sitä, miten verkkosivustoa ja varausprosessia käytetään analytiikan avulla — oikeusperuste: suostumuksesi, jonka voit peruuttaa milloin tahansa vaikuttamatta vuokraukseesi.",
      ],
    },
    {
      heading: "Kenen kanssa jaamme tietojasi (käsittelijät)",
      body: [
        "Käytämme luotettuja palveluntarjoajia, jotka käsittelevät henkilötietoja puolestamme käsittelijöinä, tietojenkäsittelysopimusten nojalla ja vain ohjeidemme mukaisesti. Emme myy henkilötietojasi.",
        "Resend — lähettää tapahtuma- ja palvelusähköposteja varauksestasi ja vuokrauksestasi.",
        "Montonio — käsittelee korttimaksut ja vakuuden, kun verkkokorttimaksut on otettu käyttöön.",
        "Dokobit — hoitaa vuokrasopimuksen henkilöllisyyteen perustuvan sähköisen allekirjoittamisen, kun sähköinen allekirjoitus on otettu käyttöön.",
        "Vercel — isännöi ja tarjoaa rentaron verkkosivustoa.",
        "Railway — isännöi sovelluksemme taustajärjestelmää ja tietokantaa EU:ssa.",
        "Google Analytics ja PostHog — tarjoavat verkkosivusto- ja tuoteanalytiikkaa ja toimivat vain, kun olet antanut suostumuksesi; PostHog on isännöity EU:ssa.",
        "Voimme myös luovuttaa tietoja, kun laki sitä edellyttää, oikeuksiemme tai turvallisuutemme suojaamiseksi tai liiketoiminnan myynnin tai uudelleenjärjestelyn yhteydessä, jolloin ne pysyvät suojattuina tämän käytännön nojalla.",
      ],
    },
    {
      heading: "Kansainväliset siirrot",
      body: [
        "Pyrimme pitämään henkilötiedot Euroopan talousalueella (ETA). Isännöintimme (Vercel, Railway) ja EU:ssa isännöity analytiikka (PostHog) on määritetty pitämään tiedot EU:ssa/ETA:lla mahdollisuuksien mukaan.",
        "Jotkin palveluntarjoajat, kuten Google Analytics, voivat käsitellä rajoitettuja tietoja ETA:n ulkopuolella. Kun näin tapahtuu, nojaudumme asianmukaisiin suojatoimiin — kuten Euroopan komission vakiosopimuslausekkeisiin tai riittävyyspäätökseen — jotta tietosi pysyvät suojattuina EU:n standardien mukaisesti.",
      ],
    },
    {
      heading: "Kuinka kauan säilytämme tietojasi",
      body: [
        "Säilytämme henkilötietoja vain niin kauan kuin se on tarpeen edellä mainittuihin tarkoituksiin, minkä jälkeen poistamme tai anonymisoimme ne.",
        "Varaus- ja vuokraustiedot sekä kirjanpito- ja verotiedot säilytetään Viron lain edellyttämien ajanjaksojen ajan (kirjanpitotiedot säilytetään yleensä seitsemän vuotta).",
        "Henkilöllisyyden todentamisasiakirjoja ja henkilötunnustasi säilytetään vain niin kauan kuin on tarpeen vuokrasopimuksen tekemiseksi ja tukemiseksi sekä lakisääteisten velvoitteiden täyttämiseksi, minkä jälkeen ne poistetaan. Analytiikkatietoja säilytetään rajoitetun ajan työkalujen asetusten mukaisesti, ja suostumustietoja säilytetään niin kauan kuin on tarpeen valintasi todistamiseksi. Markkinointi- tai valinnaisten viestien suostumukset säilytetään, kunnes peruutat ne.",
      ],
    },
    {
      heading: "Oikeutesi",
      body: [
        "GDPR:n nojalla sinulla on oikeus saada pääsy henkilötietoihisi; saada virheelliset tiedot korjattua; saada tiedot poistettua; rajoittaa tiettyä käsittelyä tai vastustaa sitä; tietojen siirrettävyyteen; ja, kun nojaudumme suostumukseen, peruuttaa se milloin tahansa vaikuttamatta jo suoritettuun käsittelyyn.",
        "Käyttääksesi mitä tahansa näistä oikeuksista ota meihin yhteyttä edellä mainituilla tiedoilla. Vastaamme lain asettamissa määräajoissa. Sinulla on myös oikeus tehdä valitus valvontaviranomaiselle — Virossa tietosuojavaltuutetulle (Andmekaitse Inspektsioon) — tai sen EU-maan viranomaiselle, jossa asut tai työskentelet.",
      ],
    },
    {
      heading: "Automatisoitu päätöksenteko",
      body: [
        "Emme tee sinua koskevia päätöksiä pelkästään automatisoidun käsittelyn perusteella, joka tuottaa oikeudellisia tai vastaavalla tavalla merkittäviä vaikutuksia. Henkilöllisyyden todentamiseen ja vuokrauksen hyväksymiseen liittyy ihmisen suorittama tarkastus.",
      ],
    },
    /* Cookie policy folded into the privacy policy so the consent banner
       and footer (which both link to /privacy) reach it. The cookiePolicy
       export above reuses the same content for any future /cookies page. */
    ...cookiePolicy.sections,
  ],
};
