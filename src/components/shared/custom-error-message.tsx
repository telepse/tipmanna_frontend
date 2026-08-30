interface Props {
  message: string;
}

export const CustomErrorMessage = ({ message }: Props) => {
  return <p className="text-destructive text-sm">{message}</p>;
};
