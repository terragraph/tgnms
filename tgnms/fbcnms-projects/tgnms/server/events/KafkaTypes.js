export type Message = {
  topic:string,
  value:string,
  offset:number,
  partition:number,
  key:string,
  timestamp:string
}
