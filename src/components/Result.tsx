interface ResultProps {
  result: {
    codeResult: {
      code: any;
      format: any;
    };
  };
}

export const Result = ({ result }: ResultProps) => (
  <li>
    {result.codeResult.code} [{result.codeResult.format}]
  </li>
);
