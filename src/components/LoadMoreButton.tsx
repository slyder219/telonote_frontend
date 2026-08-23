import Button from './Button'

interface LoadMoreButtonProps {
  onClick: () => void
  isLoading: boolean
  label?: string
}

export default function LoadMoreButton({ onClick, isLoading, label = 'Load more' }: LoadMoreButtonProps) {
  return (
    <Button type="button" variant="secondary" fullWidth isLoading={isLoading} onClick={onClick}>
      {label}
    </Button>
  )
}
