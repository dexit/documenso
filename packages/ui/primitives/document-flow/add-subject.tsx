'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';

import { RECIPIENT_ROLES_DESCRIPTION } from '@documenso/lib/constants/recipient-roles';
import { ZDocumentEmailSettingsSchema } from '@documenso/lib/types/document-email';
import { formatSigningLink } from '@documenso/lib/utils/recipients';
import type { Field, Recipient } from '@documenso/prisma/client';
import {
  DocumentDistributionMethod,
  DocumentStatus,
  RecipientRole,
} from '@documenso/prisma/client';
import type { DocumentWithData } from '@documenso/prisma/types/document-with-data';
import { trpc } from '@documenso/trpc/react';
import { DocumentSendEmailMessageHelper } from '@documenso/ui/components/document/document-send-email-message-helper';
import { Tabs, TabsList, TabsTrigger } from '@documenso/ui/primitives/tabs';

import { CopyTextButton } from '../../components/common/copy-text-button';
import { DocumentEmailCheckboxes } from '../../components/document/document-email-checkboxes';
import { AvatarWithText } from '../avatar';
import { Button } from '../button';
import { FormErrorMessage } from '../form/form-error-message';
import { Input } from '../input';
import { Label } from '../label';
import { useStep } from '../stepper';
import { Textarea } from '../textarea';
import { useToast } from '../use-toast';
import { type TAddSubjectFormSchema, ZAddSubjectFormSchema } from './add-subject.types';
import {
  DocumentFlowFormContainerActions,
  DocumentFlowFormContainerContent,
  DocumentFlowFormContainerFooter,
  DocumentFlowFormContainerHeader,
  DocumentFlowFormContainerStep,
} from './document-flow-root';
import { ShowFieldItem } from './show-field-item';
import type { DocumentFlowStep } from './types';

export type AddSubjectFormProps = {
  documentFlow: DocumentFlowStep;
  recipients: Recipient[];
  fields: Field[];
  document: DocumentWithData;
  onSubmit: (_data: TAddSubjectFormSchema) => void;
  isDocumentPdfLoaded: boolean;
};

export const AddSubjectFormPartial = ({
  documentFlow,
  recipients: recipients,
  fields: fields,
  document,
  onSubmit,
  isDocumentPdfLoaded,
}: AddSubjectFormProps) => {
  const { _ } = useLingui();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TAddSubjectFormSchema>({
    defaultValues: {
      meta: {
        subject: document.documentMeta?.subject ?? '',
        message: document.documentMeta?.message ?? '',
        distributionMethod:
          document.documentMeta?.distributionMethod || DocumentDistributionMethod.EMAIL,
        emailSettings: ZDocumentEmailSettingsSchema.parse(document?.documentMeta?.emailSettings),
      },
    },
    resolver: zodResolver(ZAddSubjectFormSchema),
  });

  const GoNextLabel = {
    [DocumentDistributionMethod.EMAIL]: {
      [DocumentStatus.DRAFT]: msg`Send`,
      [DocumentStatus.PENDING]: recipients.some((recipient) => recipient.sendStatus === 'SENT')
        ? msg`Resend`
        : msg`Send`,
      [DocumentStatus.COMPLETED]: msg`Update`,
    },
    [DocumentDistributionMethod.NONE]: {
      [DocumentStatus.DRAFT]: msg`Generate Links`,
      [DocumentStatus.PENDING]: msg`View Document`,
      [DocumentStatus.COMPLETED]: msg`View Document`,
    },
  };

  const {
    mutate: emailSupport,
    isLoading,
    isSuccess,
  } = trpc.document.requestLineSupport.useMutation({
    onSuccess() {
      toast({
        title: _(msg`Request sent successfully!`),
        description: _(msg`Support will reach out as soon as possible to your email.`),
      });
    },
    onError() {
      toast({
        title: _(msg`There was an error sending your request`),
        description: _(msg`Please try again later`),
      });
    },
  });

  const requestLineSupport = () => {
    emailSupport();
  };

  const distributionMethod = watch('meta.distributionMethod');
  const emailSettings = watch('meta.emailSettings');

  const onFormSubmit = handleSubmit(onSubmit);
  const { currentStep, totalSteps, previousStep } = useStep();

  return (
    <>
      <DocumentFlowFormContainerHeader
        title={documentFlow.title}
        description={documentFlow.description}
      />
      <DocumentFlowFormContainerContent>
        <div className="flex flex-col">
          {isDocumentPdfLoaded &&
            fields.map((field, index) => (
              <ShowFieldItem key={index} field={field} recipients={recipients} />
            ))}

          <Tabs
            onValueChange={(value) =>
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              setValue('meta.distributionMethod', value as DocumentDistributionMethod)
            }
            value={distributionMethod}
            className="mb-2"
          >
            <TabsList className="w-full">
              <TabsTrigger className="w-full" value={DocumentDistributionMethod.EMAIL}>
                Email
              </TabsTrigger>
              <TabsTrigger className="w-full" value={DocumentDistributionMethod.NONE}>
                None
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <AnimatePresence mode="wait">
            {distributionMethod === DocumentDistributionMethod.EMAIL && (
              <motion.div
                key={'Emails'}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="flex flex-col gap-y-4 rounded-lg border p-4"
              >
                <div>
                  <Label htmlFor="subject">
                    <Trans>
                      Subject <span className="text-muted-foreground">(Optional)</span>
                    </Trans>
                  </Label>

                  <Input
                    id="subject"
                    className="bg-background mt-2"
                    disabled={isSubmitting}
                    {...register('meta.subject')}
                  />

                  <FormErrorMessage className="mt-2" error={errors.meta?.subject} />
                </div>

                <div>
                  <Label htmlFor="message">
                    <Trans>
                      Message <span className="text-muted-foreground">(Optional)</span>
                    </Trans>
                  </Label>

                  <Textarea
                    id="message"
                    className="bg-background mt-2 h-32 resize-none"
                    disabled={isSubmitting}
                    {...register('meta.message')}
                  />

                  <FormErrorMessage
                    className="mt-2"
                    error={
                      typeof errors.meta?.message !== 'string' ? errors.meta?.message : undefined
                    }
                  />
                </div>

                <DocumentSendEmailMessageHelper />

                <DocumentEmailCheckboxes
                  className="mt-2"
                  value={emailSettings}
                  onChange={(value) => setValue('meta.emailSettings', value)}
                />
              </motion.div>
            )}

            {distributionMethod === DocumentDistributionMethod.NONE && (
              <motion.div
                key={'Links'}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="rounded-lg border"
              >
                {document.status === DocumentStatus.DRAFT ? (
                  <div className="text-muted-foreground py-16 text-center text-sm">
                    <p>
                      <Trans>We won't send anything to notify recipients.</Trans>
                    </p>

                    <div>
                      <p className="p-2">
                        <Trans>
                          We will generate signing links for you, which you can send to the
                          recipients through your method of choice.
                        </Trans>
                      </p>

                      <hr className="border-order my-4" />

                      <p>
                        <Trans>
                          If you wish to send through LINE, the integration has been moved to a
                          separate platform. If you wish to request access please click the button
                          below.
                        </Trans>
                      </p>

                      <div className="center mt-8">
                        <Button
                          onClick={requestLineSupport}
                          type="button"
                          className="bg-documenso flex-1"
                          size="lg"
                          disabled={isLoading || isSuccess}
                          loading={isLoading}
                        >
                          <Trans>Request Line Support</Trans>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ul className="text-muted-foreground divide-y">
                    {recipients.length === 0 && (
                      <li className="flex flex-col items-center justify-center py-6 text-sm">
                        <Trans>No recipients</Trans>
                      </li>
                    )}

                    {recipients.map((recipient) => (
                      <li
                        key={recipient.id}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
                        <AvatarWithText
                          avatarFallback={recipient.email.slice(0, 1).toUpperCase()}
                          primaryText={
                            <p className="text-muted-foreground text-sm">{recipient.email}</p>
                          }
                          secondaryText={
                            <p className="text-muted-foreground/70 text-xs">
                              {_(RECIPIENT_ROLES_DESCRIPTION[recipient.role].roleName)}
                            </p>
                          }
                        />

                        {recipient.role !== RecipientRole.CC && (
                          <CopyTextButton
                            value={formatSigningLink(recipient.token)}
                            onCopySuccess={() => {
                              toast({
                                title: _(msg`Copied to clipboard`),
                                description: _(
                                  msg`The signing link has been copied to your clipboard.`,
                                ),
                              });
                            }}
                            badgeContentUncopied={
                              <p className="ml-1 text-xs">
                                <Trans>Copy</Trans>
                              </p>
                            }
                            badgeContentCopied={
                              <p className="ml-1 text-xs">
                                <Trans>Copied</Trans>
                              </p>
                            }
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DocumentFlowFormContainerContent>

      <DocumentFlowFormContainerFooter>
        <DocumentFlowFormContainerStep step={currentStep} maxStep={totalSteps} />

        <DocumentFlowFormContainerActions
          loading={isSubmitting}
          disabled={isSubmitting}
          goNextLabel={GoNextLabel[distributionMethod][document.status]}
          onGoBackClick={previousStep}
          onGoNextClick={() => void onFormSubmit()}
        />
      </DocumentFlowFormContainerFooter>
    </>
  );
};
