import Support from "~/components/common/Support";
import { getSurveyImageUrl } from "~/lib/surveys/helpers/getSurveyImageUrl";
import { rscMustGetSurveyEditionFromUrl } from "./rsc-fetchers";
import { DebugRSC } from "~/components/debug/DebugRSC";
import Faq from "~/components/common/Faq";
import Translators from "~/components/common/Translators";
import SurveyCredits from "~/components/surveys/SurveyCredits";
import EditionMessage from "~/components/surveys/SurveyMessage";
import { FormattedMessage } from "~/components/common/FormattedMessage";
import { EditionMetadata } from "@devographics/types";
import { EditionMain } from "./client-components";

interface SurveyPageServerProps {
  slug: string;
  year: string;
  // inherited from above segment
  lang: string;
}

const EditionPageComponent = ({
  edition,
  imageUrl,
}: {
  edition: EditionMetadata;
  imageUrl?: string;
}) => {
  const { survey } = edition;
  const { name } = survey;
  return (
    <div className="survey-page contents-narrow">
      <EditionMessage edition={edition} />

      {!!imageUrl && (
        <h1 className="survey-image">
          <img
            width={600}
            height={400}
            src={imageUrl}
            alt={`${name} ${edition.year}`}
          />
        </h1>
      )}
      <div className="survey-page-block">
        <FormattedMessage id={`general.${edition.id}.survey_intro`} />
        <EditionMain edition={edition} />
      </div>
      <Faq survey={edition} />
      {edition.credits && <SurveyCredits edition={edition} />}
      <Translators />
    </div>
  );
};

export default async function SurveyPage({
  params,
}: {
  params: SurveyPageServerProps;
}) {
  const { slug, year, lang } = params;
  const { data: edition, ___metadata: ___rscMustGetSurveyEditionFromUrl } =
    await rscMustGetSurveyEditionFromUrl({
      slug,
      year,
    });
  const imageUrl = getSurveyImageUrl(edition);
  return (
    <div>
      <DebugRSC {...{ ___rscMustGetSurveyEditionFromUrl }} />
      <EditionPageComponent edition={edition} imageUrl={imageUrl} />
      {edition.survey.partners && <Support edition={edition} />}
    </div>
  );
}
