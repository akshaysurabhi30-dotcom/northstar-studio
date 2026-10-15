import { PageLink } from '../components/PageLink'

function MoleculeDiagram() {
  return <figure className="science-figure">
    <svg viewBox="0 0 520 350" role="img" aria-labelledby="molecule-title molecule-desc">
      <title id="molecule-title">Organic carbon in a water sample</title>
      <desc id="molecule-desc">A sample separates into material retained by a filter and dissolved and colloidal organic molecules that pass through it.</desc>
      <defs>
        <linearGradient id="water-fill" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#dceddf"/><stop offset="1" stopColor="#a9d8ca"/></linearGradient>
        <marker id="arrow-head" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 9 4.5 0 9" fill="none" stroke="#326d5d" strokeWidth="1.5"/></marker>
      </defs>
      <rect x="18" y="18" width="484" height="314" rx="26" fill="#f9f7ee" />
      <path d="M42 116 Q144 99 250 116 T478 116 V296 H42Z" fill="url(#water-fill)" />
      <path d="M42 116 Q144 99 250 116 T478 116" fill="none" stroke="#75ad98" strokeWidth="3" />
      <g fill="#4b8070" opacity=".94">
        <circle cx="93" cy="159" r="18"/><circle cx="171" cy="211" r="11"/><circle cx="125" cy="264" r="14"/>
      </g>
      <g stroke="#155347" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="m298 166 25-15 26 14-3 30-28 12-23-16z"/><path d="m383 224 19-13 20 12-3 23-22 9-17-14z"/><path d="m238 251 15-10 17 8-2 20-17 7-14-11z"/>
      </g>
      <g fill="#d3a43c"><circle cx="322" cy="151" r="5"/><circle cx="402" cy="210" r="5"/><circle cx="253" cy="241" r="5"/></g>
      <path d="M232 85h76" stroke="#326d5d" strokeWidth="2" markerEnd="url(#arrow-head)" />
      <path d="M305 96v195" stroke="#fffdf6" strokeWidth="7" strokeDasharray="4 8" />
      <text x="72" y="77" fill="#557267" fontSize="14" fontFamily="system-ui">WHOLE WATER</text>
      <text x="328" y="77" fill="#557267" fontSize="14" fontFamily="system-ui">FILTER-PASSING FRACTION</text>
      <text x="61" y="309" fill="#244f43" fontSize="14" fontFamily="system-ui">Suspended particles</text>
      <text x="326" y="309" fill="#244f43" fontSize="14" fontFamily="system-ui">Dissolved + colloidal DOC</text>
    </svg>
    <figcaption>DOC is defined by an operational separation step. It is not one molecule.</figcaption>
  </figure>
}

function WatershedDiagram() {
  return <figure className="science-figure">
    <svg viewBox="0 0 700 400" role="img" aria-labelledby="basin-title basin-desc">
      <title id="basin-title">How a watershed moves organic carbon into a stream</title>
      <desc id="basin-desc">Rain and leaf litter move through soil and groundwater. Carbon enters a stream, where sunlight and microbes change it before downstream transport.</desc>
      <defs><linearGradient id="stream" x1="0" x2="1"><stop stopColor="#3c9489"/><stop offset="1" stopColor="#73bcb1"/></linearGradient><marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 8 4 0 8" fill="#326d5d"/></marker></defs>
      <rect x="12" y="12" width="676" height="376" rx="28" fill="#f8f7ee" />
      <circle cx="577" cy="90" r="29" fill="#e5b94f" />
      <path d="M34 250 Q151 85 270 242 Q350 126 445 228 Q538 117 665 226 L665 330 34 330Z" fill="#d7e7d6" />
      <path d="M37 282 Q142 202 250 281 T462 273 Q553 225 665 284 L665 346 37 346Z" fill="#b7d0ae" />
      <path d="M213 291 Q276 276 330 292 T430 294 Q478 284 544 301" fill="none" stroke="url(#stream)" strokeWidth="24" strokeLinecap="round" />
      <path d="M213 291 Q276 276 330 292 T430 294 Q478 284 544 301" fill="none" stroke="#eff9ec" strokeWidth="2" strokeDasharray="8 12" />
      <g stroke="#326d5d" strokeWidth="2" fill="none" markerEnd="url(#flow-arrow)">
        <path d="M121 131 171 211"/><path d="M239 171 267 259"/><path d="M554 141 473 264"/><path d="M446 301h66"/>
      </g>
      <g fill="#c18c38"><ellipse cx="150" cy="219" rx="9" ry="4" transform="rotate(32 150 219)"/><ellipse cx="163" cy="230" rx="8" ry="4" transform="rotate(-18 163 230)"/><ellipse cx="173" cy="216" rx="8" ry="4" transform="rotate(50 173 216)"/></g>
      <g fill="#35675a"><circle cx="350" cy="282" r="4"/><circle cx="366" cy="298" r="3"/><circle cx="387" cy="286" r="4"/></g>
      <path d="M330 185v43" stroke="#dba635" strokeWidth="3" markerEnd="url(#flow-arrow)" />
      <text x="66" y="72" fill="#244f43" fontSize="15" fontFamily="system-ui">Rain + leaf litter</text>
      <text x="269" y="160" fill="#244f43" fontSize="15" fontFamily="system-ui">Soil water</text>
      <text x="490" y="122" fill="#244f43" fontSize="15" fontFamily="system-ui">Sunlight</text>
      <text x="260" y="367" fill="#244f43" fontSize="15" fontFamily="system-ui">Stream: transport · microbial use · light-driven reactions</text>
      <text x="50" y="300" fill="#6f5832" fontSize="13" fontFamily="system-ui">Organic matter</text>
      <text x="501" y="283" fill="#244f43" fontSize="13" fontFamily="system-ui">Downstream</text>
    </svg>
    <figcaption>DOC moves through a connected landscape. Concentration can change along the flow path.</figcaption>
  </figure>
}

function LabDiagram() {
  return <figure className="science-figure">
    <svg viewBox="0 0 700 300" role="img" aria-labelledby="lab-title lab-desc">
      <title id="lab-title">Laboratory measurement sequence for DOC</title>
      <desc id="lab-desc">The lab filters a water sample, removes inorganic carbon, oxidizes organic carbon to carbon dioxide, detects it, and reports the carbon concentration.</desc>
      <defs><marker id="lab-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 9 4.5 0 9" fill="none" stroke="#367465" strokeWidth="1.6"/></marker></defs>
      <rect x="12" y="12" width="676" height="276" rx="26" fill="#f9f7ee" />
      <g fill="#fff" stroke="#d3e3d7" strokeWidth="2">
        <rect x="30" y="85" width="115" height="126" rx="16"/><rect x="194" y="85" width="115" height="126" rx="16"/><rect x="358" y="85" width="115" height="126" rx="16"/><rect x="522" y="85" width="145" height="126" rx="16"/>
      </g>
      <g stroke="#367465" strokeWidth="2" fill="none" markerEnd="url(#lab-arrow)"><path d="M150 148h36"/><path d="M314 148h36"/><path d="M478 148h36"/></g>
      <g fill="#a4d1be"><path d="M69 110h37l-4 55q-14 17-29 0z"/><path d="M233 108h36v30l-7 8v31h-22v-31l-7-8z"/><circle cx="415" cy="141" r="25"/><rect x="559" y="121" width="66" height="45" rx="6"/></g>
      <g fill="#1b594c" fontFamily="system-ui" fontSize="14" textAnchor="middle">
        <text x="88" y="187">Filter the sample</text><text x="252" y="187">Remove inorganic C</text><text x="416" y="187">Oxidize to CO₂</text><text x="594" y="187">Detect + report</text>
      </g>
      <g fill="#6a8175" fontFamily="system-ui" fontSize="12" textAnchor="middle"><text x="88" y="231">0.45 μm in EPA 415.3</text><text x="252" y="231">Acidify + purge</text><text x="416" y="231">Combustion or persulfate</text><text x="594" y="231">mg C/L</text></g>
    </svg>
    <figcaption>DOC is a measured carbon concentration. Method 415.3 defines the filter and oxidation steps.</figcaption>
  </figure>
}

function PredictionDiagram() {
  return <figure className="science-figure prediction-diagram">
    <svg viewBox="0 0 780 390" role="img" aria-labelledby="model-title model-desc">
      <title id="model-title">ClearCurrent DOC model workflow</title>
      <desc id="model-desc">A selected coordinate finds a HydroBASINS polygon. Its attributes and the date form eight numeric features. Saved median imputation and scaling are applied. A saved encoder provides three land-cover indicators. The 11 features enter the stacked model and its log prediction is converted to milligrams per liter.</desc>
      <defs><marker id="model-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8" fill="#387466"/></marker></defs>
      <rect x="12" y="10" width="756" height="370" rx="24" fill="#f8f7ee" />
      <g fontFamily="system-ui" fontSize="13" textAnchor="middle">
        <g fill="#fff" stroke="#cbded2" strokeWidth="2"><rect x="35" y="48" width="153" height="54" rx="12"/><rect x="226" y="48" width="161" height="54" rx="12"/><rect x="425" y="37" width="156" height="77" rx="12"/><rect x="624" y="48" width="115" height="54" rx="12"/><rect x="226" y="162" width="161" height="66" rx="12"/><rect x="425" y="162" width="156" height="66" rx="12"/><rect x="624" y="162" width="115" height="66" rx="12"/><rect x="425" y="280" width="156" height="62" rx="12"/></g>
        <g fill="#1f5146"><text x="111" y="71">Latitude, longitude</text><text x="111" y="90">+ selected date</text><text x="306" y="71">Find polygon</text><text x="306" y="90">HYBAS_ID</text><text x="503" y="66">Catchment attributes</text><text x="503" y="87">area · elevation</text><text x="503" y="104">discharge · land cover</text><text x="681" y="71">8 numeric</text><text x="681" y="90">features</text><text x="306" y="188">Saved median</text><text x="306" y="210">imputer → scaler</text><text x="503" y="189">Saved one-hot</text><text x="503" y="210">encoder → 3 flags</text><text x="681" y="189">Join</text><text x="681" y="210">11 features</text><text x="503" y="305">Saved stacked model</text><text x="503" y="326">inverse log1p → mg/L</text></g>
        <g stroke="#387466" strokeWidth="2" fill="none" markerEnd="url(#model-arrow)"><path d="M189 75h31"/><path d="M388 75h31"/><path d="M583 75h31"/><path d="M681 104v47"/><path d="M585 196h31"/><path d="M680 229 566 271"/><path d="M306 103v56"/><path d="M386 195h32"/><path d="M503 230v44"/></g>
        <path d="M503 117v34" stroke="#d2a34a" strokeWidth="2" strokeDasharray="5 5" markerEnd="url(#model-arrow)"/>
        <g fill="#70887a" fontSize="11"><text x="274" y="145">date fields</text><text x="512" y="145">categorical field</text></g>
      </g>
    </svg>
    <figcaption>The numeric and categorical branches are transformed separately. They join only before the saved estimator.</figcaption>
  </figure>
}

const sources = [
  { id: 'source-usgs-color', label: 'USGS Water Science School · Water color', url: 'https://www.usgs.gov/water-science-school/science/water-color' },
  { id: 'source-usgs-data', label: 'USGS National Water Quality Network · DOC methods and data', url: 'https://www.usgs.gov/data/dissolved-organic-carbon-concentration-and-dissolved-organic-matter-characteristics-surface' },
  { id: 'source-epa', label: 'U.S. EPA Method 415.3 · TOC, DOC, and SUVA', url: 'https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P1006Q0X.TXT' },
  { id: 'source-study', label: 'Liu, Chang & Tang · Monthly DOC predictions for forested headwaters', url: 'https://doi.org/10.1038/s41597-025-06522-3' },
]

export function DocGuidePage() {
  return <main className="page-shell science-page">
    <header className="science-intro">
      <span className="science-kicker">A field guide to dissolved organic carbon</span>
      <h1>Follow carbon<br /><em>from soil to stream.</em></h1>
      <p>Learn what DOC is, how scientists measure it, and what a watershed model can tell you.</p>
      <nav className="chapter-nav" aria-label="DOC guide chapters">
        <a href="#guide-molecule">01 Molecule</a><a href="#guide-watershed">02 Watershed</a><a href="#guide-method">03 Measurement</a><a href="#guide-model">04 Model</a>
      </nav>
      <div className="guide-stat-row"><span><b>DOC</b> carbon concentration</span><span><b>mg/L</b> common unit</span><span><b>4 parts</b> from molecule to model</span></div>
    </header>

    <section className="guide-chapter" id="guide-molecule" aria-labelledby="molecule-heading">
      <div className="chapter-copy">
        <span className="chapter-number">01 / 04 · CHEMISTRY</span>
        <h2 id="molecule-heading">DOC is a measurement, not a single chemical.</h2>
        <p>Water carries a mixture of carbon-based compounds from plants, soils, microbes, and other sources. Scientists call the full mixture <strong>dissolved organic matter</strong> (DOM). DOC measures only the carbon within that mixture.</p>
        <p>In common water methods, a sample passes through a 0.45-micrometer filter. The organic carbon in the passing fraction is reported as DOC. That operational boundary can include small colloids, so “dissolved” does not mean every molecule is a tiny, isolated solute.<a href="#source-epa" className="source-mark" aria-label="Source 3">3</a></p>
        <p>Some DOM absorbs visible light. This colored portion is called <strong>chromophoric dissolved organic matter</strong> (CDOM). It can tint water yellow or brown. But color is not a direct DOC meter: two samples with equal DOC can have different optical properties because their compounds differ.<a href="#source-usgs-color" className="source-mark" aria-label="Source 1">1</a></p>
        <div className="science-callout"><b>Keep the terms separate.</b><span>DOM describes the mixture. DOC measures its carbon. CDOM describes its light-absorbing fraction.</span></div>
      </div>
      <MoleculeDiagram />
      <div className="chapter-footnote"><span>LAB TERM</span>DOC concentration is mass of carbon per volume of water. This app reports mg/L.</div>
    </section>

    <section className="guide-chapter" id="guide-watershed" aria-labelledby="watershed-heading">
      <div className="chapter-copy">
        <span className="chapter-number">02 / 04 · WATERSHED PROCESSES</span>
        <h2 id="watershed-heading">A watershed connects land, water, and time.</h2>
        <p>Rain can dissolve organic compounds as it moves through leaf litter and soil. Shallow flow often carries a strong terrestrial signal. Groundwater and deeper flow paths can carry a different mix. The balance changes with geology, vegetation, soil, and hydrology.</p>
        <p>Once DOC reaches a stream, microbes can consume part of it. Sunlight can transform light-absorbing compounds. Mixing, settling, and dilution also alter the concentration and composition downstream. A sample therefore reflects both its source and its travel history.<a href="#source-study" className="source-mark" aria-label="Source 4">4</a></p>
        <p>Storms and seasonal shifts change flow paths and contact time. A rising hydrograph may connect streams to shallow, carbon-rich soils. During other conditions, groundwater may form a larger share of streamflow. These patterns vary among basins; one seasonal rule does not fit every river.</p>
        <div className="process-key"><span><i className="key-source"/>Source</span><span><i className="key-transport"/>Transport</span><span><i className="key-change"/>Transformation</span></div>
      </div>
      <WatershedDiagram />
      <div className="chapter-footnote"><span>FIELD VIEW</span>Catchment area, discharge, elevation, and land cover describe different controls. None directly measures DOC.</div>
    </section>

    <section className="guide-chapter" id="guide-method" aria-labelledby="method-heading">
      <div className="chapter-copy">
        <span className="chapter-number">03 / 04 · ANALYTICAL CHEMISTRY</span>
        <h2 id="method-heading">A lab turns a water sample into mg/L.</h2>
        <p>DOC analysis separates the target from two other carbon pools. Total organic carbon (TOC) includes dissolved and particulate organic carbon in the measured whole-water sample. Inorganic carbon (IC), such as dissolved carbonate, must be removed before the organic-carbon signal is read.</p>
        <p>EPA Method 415.3 defines DOC using a 0.45 μm filtered sample. The method acidifies the sample and removes inorganic carbon. An instrument oxidizes organic carbon to carbon dioxide (CO₂). A detector measures the carbon signal against calibration standards and reports a concentration.<a href="#source-epa" className="source-mark" aria-label="Source 3">3</a></p>
        <p>Oxidation can use combustion or chemical oxidation with persulfate. The lab must manage blanks, calibration checks, duplicates, and contamination. Filter handling, preservation, storage, and timing follow the selected method. They are part of the measurement, not optional details.</p>
        <p>Optical measures add information about character. UV absorbance at 254 nm is sensitive to some aromatic compounds. SUVA<sub>254</sub> divides UV absorbance by DOC concentration, with unit conversion, and is used as an indicator related to aromaticity. Iron and other matrix effects can influence the optical signal.<a href="#source-usgs-data" className="source-mark" aria-label="Source 2">2</a></p>
        <div className="science-callout"><b>Concentration ≠ load.</b><span>DOC in mg/L describes concentration. Carbon export also depends on water flow through time.</span></div>
      </div>
      <LabDiagram />
      <div className="chapter-footnote"><span>QUALITY CONTROL</span>A model prediction cannot replace a filtered, preserved, laboratory-analyzed sample.</div>
    </section>

    <section className="guide-chapter model-chapter" id="guide-model" aria-labelledby="model-heading">
      <div className="chapter-copy">
        <span className="chapter-number">04 / 04 · CLEARCURRENT MODEL</span>
        <h2 id="model-heading">From a map click to a model estimate.</h2>
        <p>The map sends latitude, longitude, and date to the local prediction service. The service finds the covering HydroBASINS Level-12 catchment. It then reads that polygon’s BasinATLAS fields. These are watershed-scale attributes, not measurements from the clicked point.</p>
        <p>The model input row has eight numeric values and three land-cover indicators. Date supplies day of year and cyclic month terms. BasinATLAS upstream area, mean elevation, annual natural discharge, and GLC2000 land cover provide prototype spatial inputs.</p>
        <p>The saved median imputer fills missing numeric values. The saved scaler standardizes those eight numeric values. A saved one-hot encoder maps land cover: Broadleaf is the reference; Mixed, Needleleaf, and unknown become three indicator columns. They join the scaled numeric values in the order used by the saved stacked model.</p>
        <p>The training code fits the model to log(1 + DOC). The API applies the inverse exp(x) − 1 transform and returns mg/L. BasinATLAS substitutes remain approximate matches to some training variables. The prototype does not return a calibrated prediction interval.</p>
      </div>
      <PredictionDiagram />
      <div className="feature-spec">
        <h3>Model input, in order</h3>
        <div className="feature-columns">
          <div><span>NUMERIC · IMPUTE, THEN SCALE</span><code>Lat · Lon · area · altitude · dis_mean · doy · month_sin · month_cos</code></div>
          <div><span>CATEGORICAL · ONE-HOT ENCODE</span><code>dom_land_cover_Mixed · dom_land_cover_Needleleaf · dom_land_cover_unknown</code></div>
        </div>
        <p>The eight numeric inputs pass through saved preprocessing objects. The three land-cover flags use the saved category encoder. The model keeps this feature order at prediction time.</p>
      </div>
      <div className="study-context"><span>RELATED RESEARCH</span><p>A separate published study compiled 20,403 field measurements and reported monthly predictions for more than 90,000 forested headwater catchments. That global product uses its own training data and workflow. ClearCurrent currently runs the supplied stacked model with its documented prototype inputs.<a href="#source-study" className="source-mark" aria-label="Source 4">4</a></p></div>
      <nav className="science-refs" aria-label="Sources">
        <span>PRIMARY SOURCES</span>
        {sources.map((source, index) => <a id={source.id} key={source.id} href={source.url} target="_blank" rel="noreferrer"><b>{index + 1}</b>{source.label}<span aria-hidden="true">↗</span></a>)}
      </nav>
      <PageLink className="button guide-cta" to="/explore">Explore a watershed <span aria-hidden="true">→</span></PageLink>
    </section>
  </main>
}
