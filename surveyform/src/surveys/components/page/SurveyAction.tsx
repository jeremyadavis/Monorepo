"use client";
/*

1. Check currentUserResponse field on the survey to see if current user has a response
2. If so link to the survey
3. If not use MutatioButton to trigger the `createResponse` mutation
4. If there is an error during the mutation, show it

*/
import { useState } from "react";
import Link from "next/link";
import get from "lodash/get.js";
import isEmpty from "lodash/isEmpty.js";
import { statuses } from "~/surveys/constants";
import { FormattedMessage } from "~/core/components/common/FormattedMessage";
import { useSurveyActionParams, useBrowserData, PrefilledData } from "./hooks";
import { useRouter } from "next/navigation";
import { useUser } from "~/account/user/hooks";
import { useUserResponse } from "~/responses/hooks";
import { Loading } from "~/core/components/ui/Loading";
import { LoadingButton } from "~/core/components/ui/LoadingButton";
import { getEditionSectionPath } from "~/surveys/helpers";
import {
  getSurveyContextId,
  getSurveyEditionId,
} from "~/surveys/parser/parseSurvey";
import { ErrorObject, startEdition } from "./services";
import type { EditionMetadata } from "@devographics/types";
import { ResponseDocument } from "@devographics/core-models";

const duplicateResponseErrorId = "error.duplicate_response";

const EditionAction = ({ edition }: { edition: EditionMetadata }) => {
  const { id: editionId, surveyId } = edition;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Array<ErrorObject | Error> | undefined
  >();
  const { status } = edition;
  const { user, loading: userLoading, error: userError } = useUser();
  // TODO: fetch data during SSR instead?
  const {
    response,
    loading: responseLoading,
    error: responseError,
  } = useUserResponse({
    editionId,
    surveyId,
  });
  if (userLoading) return <Loading />;
  if (userError) throw new Error(userError);
  if (responseLoading) return <Loading />;
  if (responseError) throw new Error(responseError);
  //const currentSurveyResponse = responses?.find((r) => r.surveySlug === slug);

  const hasResponse = response && !isEmpty(response);

  const parsedErrors: Array<ErrorObject> | undefined = errors?.map((e) =>
    "id" in e ? e : { id: "app.unknown_error" }
  );

  // hide action button if there is already a duplicate response
  const hideAction = parsedErrors?.some(
    (e) => e.id === duplicateResponseErrorId
  );

  const isAvailable =
    status &&
    [statuses.preview, statuses.open, statuses.hidden].includes(status);

  const getSurveyAction = () => {
    if (isAvailable) {
      // 1. the survey is available to be filled out
      if (!hasResponse || loading) {
        // 1a. there is no response, or there is a response but we are currently loading it
        return (
          <SurveyStart
            edition={edition}
            loading={loading}
            setLoading={setLoading}
            currentUser={user}
            setErrors={setErrors}
          />
        );
      } else {
        // 1b. there is a response already
        return (
          <EditionLink
            edition={edition}
            response={response}
            message="general.continue_survey"
          />
        );
      }
    } else {
      // 2. the survey is no longer available
      return (
        <EditionLink
          edition={edition}
          message="general.review_survey"
          {...(hasResponse && { response })}
        />
      );
    }
  };

  return (
    <div className="survey-action">
      {!hideAction && (
        <div className="survey-action-inner">{getSurveyAction()}</div>
      )}
      {parsedErrors && (
        <Errors
          edition={edition}
          parsedErrors={parsedErrors}
          currentSurveyResponse={response}
        />
      )}
    </div>
  );
};

const SurveyStart = ({
  edition,
  loading,
  setLoading,
  currentUser,
  setErrors,
}: {
  edition: EditionMetadata;
  loading: boolean;
  setLoading: any;
  currentUser: any;
  setErrors: any;
}) => {
  const { id: editionId, surveyId } = edition;
  const router = useRouter();
  const { source, referrer } = useSurveyActionParams();

  // prefilled data
  let data: PrefilledData = {
    editionId,
    surveyId,
    common__user_info__source: source,
    common__user_info__referrer: referrer,
  };

  const browserData = useBrowserData();
  data = {
    ...data,
    ...browserData,
    // override only if referrer is not set already
    common__user_info__referrer:
      data.common__user_info__referrer ||
      browserData?.common__user_info__referrer,
  };

  const loadingButtonProps = {
    type: "submit",
    loading,
    variant: "primary",
    onClick: async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        // TODO: we might want to use an Error boundary and a Suspense to handle loading and errors
        const result = await startEdition({ edition, data });
        if (result.error) {
          setErrors([result.error]);
          setLoading(false);
        } else {
          // no need to stop spinner because it'll disappear when we change page
          // setLoading(false);
          console.log("start survey result", result);
          const pagePath =
            get(result, `data.startSurvey.data.pagePath`) ||
            getEditionSectionPath({
              edition,
              response: result.data,
              number: 1,
            });
          console.log(`Redirecting to ${pagePath}…`);
          router.push(pagePath);
        }
      } catch (error) {
        // TODO: this is expecting a graphql syntax for errors,
        // need to be updated
        setErrors([error]);
        setLoading(false);
        //setErrors(getErrors(error));
      } finally {
        setLoading(false);
      }
    },
  };
  return (
    <LoadingButton {...loadingButtonProps}>
      <FormattedMessage id="general.start_survey" />
    </LoadingButton>
  );
};

/*

Link to the "naked" survey path or to the actual response

*/
const EditionLink = ({
  edition,
  response,
  message,
}: {
  edition: EditionMetadata;
  response?: ResponseDocument;
  message: string;
}) => {
  return (
    // TODO: see https://www.npmjs.com/package/react-router-bootstrap
    // We should probably use a NavLink bootstrap component
    //<LinkContainer to={response.pagePath || getSurveyPath({ survey })}>
    //</LinkContainer>
    <Link
      href={response?.pagePath || getEditionSectionPath({ edition, response })}
      type="button"
      className="btn btn-primary"
    >
      <FormattedMessage id={message} />
    </Link>
  );
};

const Errors = ({ edition, parsedErrors, currentSurveyResponse }) => {
  return (
    <>
      {parsedErrors.map((error, i) => (
        <ErrorItem
          key={i}
          error={error}
          edition={edition}
          response={currentSurveyResponse}
        />
      ))}
    </>
  );
};
const ErrorItem = ({ edition, error, response }) => {
  console.log(error);
  const { id, message, properties } = error;
  return (
    <div className="survey-item-error error message">
      <FormattedMessage id={id} />{" "}
      {id === duplicateResponseErrorId && (
        <Link
          href={getEditionSectionPath({
            edition,
            // @ts-ignore
            response: { _id: properties.responseId },
          })}
        >
          <FormattedMessage id="general.continue_survey" />
        </Link>
      )}
    </div>
  );
};

export default EditionAction;
