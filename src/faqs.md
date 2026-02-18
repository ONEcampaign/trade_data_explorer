```js
import "./js/embed.js"
import * as React from "npm:react";
import {NavMenu} from "./components/NavMenu.js";
import {setCustomColors} from "./js/colors.js";
```

```js
setCustomColors();
```

```jsx
const FAQ_SECTIONS = [
    {
        title: "What is the Trade Explorer?",
        content: (
            <>
                <p>
                    The <i>Trade Explorer</i> is a data app to help you analyze trade patterns for different countries across the world.
                    It provides two options:
                </p>
                <p>
                    <b>Single Country</b> gives an overview of a country's trade position with the rest of the world.
                </p>
                <p>
                    <b>Multi Country</b> lets you explore trade between a selected country and up to five trading partners simultaneously.
                </p>
                <p>
                    All trade figures are presented from the selected country’s perspective. For example, if you choose Botswana, exports indicate goods and services
                    flowing out of Botswana to the selected partner, while imports represent inflows into Botswana. In this sense, exports are shown as positive values,
                    indicating revenue from outgoing goods and services, while imports are negative values, reflecting expenditures on incoming goods and services.
                </p>
                <p>
                    If only one trading partner is selected, all trade flows (imports, exports and trade balance) will be shown. To allow for cleaner comparisons when
                    multiple partners are selected, you can only visualize a single trade flow at a time.
                </p>
                <p>
                    To ensure that the data shown is accurate, certain options will be disabled depending on the selected <i>Country</i> and <i>Partner(s)</i>. For instance,
                    if France is selected as <i>Country</i>, you won't be able to select France, EU27 countries, G7 countries or G20 countries as <i>Partner</i>, as these options overlap with France.
                </p>
            </>
        )
    },
    {
        title: "Where does the data come from?",
        content: (
            <>
                <p>
                    Trade data is retrieved from CEPII's{' '}
                    <a href="https://cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37">BACI database</a>{' '}
                    and grouped by product category according to{' '}
                    <a href="https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition/hs-nomenclature-2022-edition.aspx">HS Nomenclature</a>,
                    with each HS section forming a category.
                </p>
            </>
        )
    },
    {
        title: "How is the data transformed?",
        content: (
            <>
                <p>
                    The original trade figures are presented in current US Dollars. They are converted into other currencies and constant prices via{' '}
                    <a href="https://github.com/jm-rivera/pydeflate">pydeflate</a>.
                </p>
                <p>
                    The data preparation scripts are located in the <span style={{fontFamily: "monospace"}}>src/data</span>{' '}
                    directory of the project's <a href="https://github.com/ONEcampaign/trade-explorer">GitHub repository</a>.
                </p>
            </>
        )
    },
    {
        title: "Who should I contact for questions and suggestions?",
        content: (
            <p>
                Please refer your comments to miguel.haroruiz[at]one[dot]org.
            </p>
        )
    }
];

function FAQSection({title, children}) {
    return (
        <section className="space-y-3">
            <h2 className="font-bold text-xl mt-8 mb-2">
                {title}
            </h2>
            <div className="space-y-4">
                {children}
            </div>
        </section>
    );
}


function App() {
    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 px-0 py-14 sm:space-y-12 sm:px-6 sm:py-10">
            <NavMenu currentPage="faqs" />
            <section
                className="space-y-4 px-4 py-2 text-md sm:px-6 lg:px-25 lg:py-10 [&_a]:text-indigo-500 [&_a]:underline [&_a:hover]:underline [&_a:focus]:underline [&_a:visited]:text-indigo-500"
                style={{ fontFamily: "Colfax, Helvetica, sans-serif" }}
            >                {FAQ_SECTIONS.map((section) => (
                    <FAQSection key={section.title} title={section.title}>
                        {section.content}
                    </FAQSection>
                ))}
            </section>
        </div>
    );
}

display(<App />);
```
