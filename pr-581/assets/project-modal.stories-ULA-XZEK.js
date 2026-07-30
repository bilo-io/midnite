import{aX as n,ay as R}from"./iframe-CsL0iqw4.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DYy2gjDW.js";import{P as H}from"./project-modal-BNBsAkV5.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Jz63yV7B.js";import"./Select-ef7c0426.esm-BpZksOel.js";import"./chevron-down-DRkv64LO.js";import"./check-INuBivbv.js";import"./index-BJhEK0kP.js";import"./triangle-alert-CDDbw1Mw.js";import"./export-menu-qyq8mNHd.js";import"./client-CghBiSrJ.js";import"./markdown-preview-s8IwK4b_.js";import"./index.dom-D_wTd2ti.js";import"./file-text-SZJ1cnhz.js";import"./copy-7QY7pcvb.js";import"./file-code-corner-CpZqTEOs.js";import"./loader-circle-XLckS9BL.js";import"./api-BL5bvBY3.js";import"./folder-open-DjP54DcH.js";import"./folder-C_jmApJR.js";import"./tag-color-picker-DRcnYxbm.js";import"./project-tag-DNgJ-pa-.js";import"./sparkles-BytqrZBg.js";import"./brain-DL2Tjzdy.js";import"./chevron-right-CyfmnmSS.js";import"./markdown-editor-1d1ow9DM.js";import"./pencil-BDc0uosH.js";import"./trash-2-DpbM2XEy.js";import"./templates-DhQvcRM-.js";import"./plus-CQpVIONi.js";import"./task-row-lyBxuTZ7.js";import"./i18n-labels-D0vKWhxe.js";import"./selectable-icon-C-8gy7Vz.js";import"./hover-expand-button-DRvNL3Rp.js";import"./index-SdqF37tT.js";import"./data-refresh-B9C8kWRs.js";import"./rotate-ccw-DjjPOeg7.js";import"./play-rRmquy6y.js";import"./square-terminal-BDWzK8LV.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
